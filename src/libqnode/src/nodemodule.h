#ifndef NODEMODULE_H
#define NODEMODULE_H

#include <QJSValue>
#include <QJSValueList>
#include <QObject>
#include <QQueue>

class NodeModule {
 public:
  virtual ~NodeModule() {}
  virtual QJSValue getJSInstance() = 0;
  virtual bool isBusy() = 0;

  // signals:
  virtual void dispatch(const QJSValue& target, const QJSValueList& args) = 0;
  virtual void ipcMessage(QJSValue msg) = 0;
  virtual void stdOutMessage(QString msg) = 0;
};

Q_DECLARE_INTERFACE(NodeModule, "NodeModule")

#endif  // NODEMODULE_H
