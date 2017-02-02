#ifndef NATIVECAP_H
#define NATIVECAP_H

#include <QObject>

#include "qnode.h"

class NativeCap : public QObject, public QNodeModule {
  Q_OBJECT
  Q_INTERFACES(QNodeModule)

 public:
  NativeCap(QNodeEngineContext* ctx);

  Q_INVOKABLE QString capitalize(QString s);

  QJSValue getJSInstance();
  bool isBusy();

 private:
  QNodeEngineContext* ctx;
  QJSValue jsInstance;

 signals:
  void dispatch(const QJSValue& target, const QJSValueList& args);
  void ipcMessage(QJSValue msg);
  void stdOutMessage(QString msg);
};

#endif  // NATIVECAP_H
