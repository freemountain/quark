#include "timermodule.h"

#include <QJSValue>
#include <QJSValueIterator>
#include "../jsvalueutils.h"
#include "../utils.h"

TimerModule::TimerModule(QNodeEngineContext* ctx) : BaseModule(ctx) {
  this->jsInstance =
      this->ctx->wrapModule(this, ":/libqnode/js/timersWrapper.js");
  this->nextID = 0;
}

int TimerModule::setTimeout(QJSValue callback, int t, QJSValue args) {
  int id = createTimer(callback, args);
  QTimer* timer = this->timers.value(id);

  timer->setSingleShot(true);
  timer->setInterval(t);
  timer->start();

  return id;
}

int TimerModule::setInterval(QJSValue callback, int t, QJSValue args) {
  int id = createTimer(callback, args);
  QTimer* timer = this->timers.value(id);

  timer->setSingleShot(false);
  timer->setInterval(t);
  timer->start();

  return id;
}

int TimerModule::createTimer(QJSValue callback, QJSValue args) {
  QJSValueList argsList = JSValueUtils::arrayToList(args);
  int id = this->nextID++;

  QTimer* timer = new QTimer(this);

  this->timers.insert(id, timer);

  connect(timer, &QTimer::timeout, [this, id, callback, argsList, timer]() {
    emit this->dispatch(callback, argsList);

    if (timer->isSingleShot()) {
      delete timer;
      this->timers.remove(id);
    }
  });

  return id;
}

void TimerModule::clear(int id) {
  QTimer* timer = this->timers.value(id);

  this->timers.remove(id);
  timer->stop();
  delete timer;
}

bool TimerModule::isBusy() { return this->timers.size() > 0; }
