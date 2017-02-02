#ifndef BASEMODULE_H
#define BASEMODULE_H

#include <QObject>

//#include "src/nodemodule.h"
#include "../../qnode.h"
#include "../engine/enginecontext.h"

class BaseModule : public QObject, public QNodeModule {
  Q_OBJECT
  Q_INTERFACES(QNodeModule)
 public:
  static BaseModule* fromJSValue(QNodeEngineContext* ctx, QJSValue value);
  explicit BaseModule(QNodeEngineContext* ctx);

  QJSValue getJSInstance();
  bool isBusy();

 protected:
  QNodeEngineContext* ctx;
  QJSValue jsInstance;

 signals:
  void dispatch(const QJSValue& target, const QJSValueList& args);
  void ipcMessage(QJSValue msg);
  void stdOutMessage(QString msg);
};

#endif  // BASEMODULE_H
