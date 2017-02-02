#ifndef TIMERWORKER_H
#define TIMERWORKER_H

#include <QHash>
#include <QObject>
#include <QTimer>

#include "src/nodeevent.h"
#include "src/nodeeventloop.h"

class TimerWorker : public QObject {
  Q_OBJECT

 public:
  explicit TimerWorker(QObject* parent = 0);
  int setTimeout(QJSValue callback, int t, QJSValueList args);
  void clear(int id);
  bool isBusy();

 private:
  int nextID;
  QHash<int, NodeEvent*> events;
  QHash<int, QTimer*> timers;

 signals:
  void dispatch(QJSValue target, QJSValueList args);

 public slots:
  void onTimer(int id);
};

#endif  // TIMERWORKER_H
