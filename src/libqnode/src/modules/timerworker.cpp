#include "timerworker.h"

#include "src/utils.h"

TimerWorker::TimerWorker(QObject* parent) : QObject(parent) {
  this->nextID = 0;
}

int TimerWorker::setTimeout(QJSValue callback, int t, QJSValueList args) {
  NodeEvent* event = new NodeEvent(callback, args);
  int id = this->nextID++;

  QTimer* timer = new QTimer(this);
  timer->setSingleShot(true);

  this->timers.insert(id, timer);
  this->events.insert(id, event);

  connect(timer, &QTimer::timeout, [id, this]() { this->onTimer(id); });
  timer->start(t);
  return id;
}

void TimerWorker::onTimer(int id) {
  NodeEvent* event = this->events.value(id);
  QTimer* timer = this->timers.value(id);

  this->timers.remove(id);
  this->events.remove(id);

  timer->deleteLater();

  emit dispatch(event->target, event->arguments);
}

void TimerWorker::clear(int id) {
  NodeEvent* event = this->events.value(id);
  QTimer* timer = this->timers.value(id);

  this->timers.remove(id);
  this->events.remove(id);

  timer->stop();
  delete event;
}

bool TimerWorker::isBusy() { return this->timers.size() > 0; }
