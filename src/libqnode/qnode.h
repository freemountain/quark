#ifndef QNODE_H
#define QNODE_H

#include <QJSValue>

#include <QDir>
#include <QObject>
#include <QTextStream>

class QNodeEngine {
 public:
  virtual ~QNodeEngine() {}
  virtual QJSValue evaluate(QString src) = 0;
  virtual QString readAllStandardOutput() = 0;
  virtual QString readAllStandardError() = 0;

  // signals:
  virtual void readyReadStandardOutput() = 0;
  virtual void readyReadStandardError() = 0;
  virtual void finished(QJSValue error, bool failed) = 0;
  virtual void ipcMessage(QJSValue msg) = 0;

 public slots:
  virtual void start(QString entry, QString cwd) = 0;
};

Q_DECLARE_INTERFACE(QNodeEngine, "QNodeEngine")

class QNodeEngineContext {
 public:
  virtual ~QNodeEngineContext() {}

  virtual QTextStream* getOutStream() = 0;
  virtual QTextStream* getErrorStream() = 0;

  Q_INVOKABLE virtual QJSValue require(QString module) = 0;
  virtual QJSValue wrapModule(QObject* module, QString wrapperPath,
                              QJSValueList args = QJSValueList()) = 0;

  virtual QString readAllStandardOutput() = 0;
  virtual QString readAllStandardError() = 0;

  virtual QJSEngine* getJsEngine() = 0;
  virtual QNodeEngine* getNodeEngine() = 0;
  Q_INVOKABLE virtual QString getCWD() = 0;

 public slots:
  virtual void writeStandardOutput(QString data) = 0;
  virtual void writeStandardError(QString data) = 0;
  virtual void flushStandardOutput() = 0;
  virtual void flushStandardError() = 0;
};

Q_DECLARE_INTERFACE(QNodeEngineContext, "QNodeEngineContext")

class QNodeModule {
 public:
  // aaa
  virtual ~QNodeModule() {}
  virtual QJSValue getJSInstance() = 0;
  virtual bool isBusy() = 0;

  // signals:
  virtual void dispatch(const QJSValue& target, const QJSValueList& args) = 0;
  virtual void ipcMessage(QJSValue msg) = 0;
  virtual void stdOutMessage(QString msg) = 0;
};

Q_DECLARE_INTERFACE(QNodeModule, "QNodeModule")

class QNodeModuleProvider {
 public:
  virtual ~QNodeModuleProvider() {}

  virtual QNodeModule* module(QNodeEngineContext* ctx, QString module) = 0;
};

Q_DECLARE_INTERFACE(QNodeModuleProvider, "QNodeModuleProvider")

#endif  // QNODE_H
