#include "nodeeventloop.h"

#include <QDebug>
#include "../jsvalueutils.h"
#include "../utils.h"

NodeEventLoop::NodeEventLoop(QJSEngine* engine) : QObject(engine) {
  this->running = false;
  this->idle = false;
  this->engine = engine;

  connect(this, &NodeEventLoop::_tick, this, &NodeEventLoop::_onTick,
          Qt::QueuedConnection);
}

int NodeEventLoop::getQueueSize() { return this->queue.size(); }

bool NodeEventLoop::isRunning() { return this->running; }

void NodeEventLoop::postEvent(QJSValue target, QJSValueList arguments) {
  NodeEvent event = NodeEvent(target, arguments);
  this->queue.enqueue(event);
  if (this->idle) emit _tick(this->getQueueSize());
}

void NodeEventLoop::_onTick(int max) {
  if (!isRunning()) return;

  int i = max;

  while (!this->queue.isEmpty() && i > 0 && isRunning()) {
    NodeEvent current = this->queue.dequeue();
    // QJSValue result = current.target.call(current.arguments);
    bool failed;
    QJSValue result =
        JSValueUtils::call(engine, current.target, current.arguments, &failed);

    if (failed) {
      this->running = false;
      emit finished(result, failed);
      return;
    }
    i--;
  }

  this->idle = this->getQueueSize() == 0;

  if (this->idle && !this->modulesBusy()) {
    this->running = false;
    emit finished(QJSValue(QJSValue::NullValue), false);
    return;
  }

  if (!this->idle) emit _tick(this->getQueueSize());
}

void NodeEventLoop::start() {
  if (this->running) return;

  this->running = true;
  emit _tick(1);
}

void NodeEventLoop::addNativeModule(QNodeModule* module) {
  this->modules.append(module);
  QObject::connect(dynamic_cast<QObject*>(module),
                   SIGNAL(dispatch(QJSValue, QJSValueList)), this,
                   SLOT(postEvent(QJSValue, QJSValueList)));
  QObject::connect(dynamic_cast<QObject*>(module), SIGNAL(ipcMessage(QJSValue)),
                   this, SIGNAL(ipcMessage(QJSValue)));
}

bool NodeEventLoop::modulesBusy() {
  for (int i = 0; i < this->modules.size(); i++) {
    if (this->modules.at(i)->isBusy()) return true;
  }

  return false;
}
