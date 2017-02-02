#ifndef INODEENGINE_H
#define INODEENGINE_H

#include <QJSValue>
#include <QObject>

class INodeEngine {
 public:
  virtual ~INodeEngine() {}
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

Q_DECLARE_INTERFACE(INodeEngine, "INodeEngine")

#endif  // INODEENGINE_H
