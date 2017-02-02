#ifndef NODEEVENTLOOP_H
#define NODEEVENTLOOP_H

#include <QJSValue>
#include <QJSValueList>
#include <QObject>
#include <QQueue>

#include "../../qnode.h"
#include "../nodemodule.h"
class NodeEvent {
 public:
  explicit NodeEvent(QJSValue target, QJSValueList arguments) {
    this->target = target;
    this->arguments = arguments;
  }
  QJSValue target;
  QJSValueList arguments;
};

class NodeEventLoop : public QObject {
  Q_OBJECT
 public:
  explicit NodeEventLoop(QJSEngine* engine);
  int getQueueSize();
  bool isRunning();
  bool modulesBusy();

 private:
  QJSEngine* engine;
  QList<QNodeModule*> modules;
  QQueue<NodeEvent> queue;
  bool running;
  bool idle;

 signals:
  void finished(QJSValue error, bool failed);
  void ipcMessage(QJSValue msg);
  void _tick(int n);

 private slots:
  void _onTick(int n);

 public slots:
  void addNativeModule(QNodeModule* module);
  void postEvent(QJSValue target, QJSValueList arguments);
  void start();
};

#endif  // NODEEVENTLOOP_H
