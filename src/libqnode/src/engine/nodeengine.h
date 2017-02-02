#ifndef NODEENGINE_H
#define NODEENGINE_H

#include <QJSEngine>
#include <QJSValue>
#include <QObject>

#include "../../qnode.h"
#include "../modules/coreprovider.h"
#include "enginecontext.h"
#include "inodeengine.h"
#include "moduleloader.h"
#include "nodeeventloop.h"

class NodeEngine : public QObject, public QNodeEngine {
  Q_OBJECT
  Q_INTERFACES(QNodeEngine)
 public:
  explicit NodeEngine(QObject* parent = 0);
  QJSValue evaluate(QString src);
  QJSValue require(QString js);
  QJSValue parseJson(QString json);
  QJSEngine* getEngine();

  QString readAllStandardOutput();
  QString readAllStandardError();

 private:
  QJSEngine* engine;
  ModuleLoader* loader;
  NodeEventLoop* loop;
  EngineContext* ctx;
  QTextStream* out;
  CoreProvider* coreProvider;

 signals:
  void readyReadStandardOutput();
  void readyReadStandardError();
  void finished(QJSValue error, bool failed);
  void ipcMessage(QJSValue msg);

 public slots:
  void start(QString entry, QString path);
};

#endif  // NODEENGINE_H
