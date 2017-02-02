#ifndef PROCESSMODULE_H
#define PROCESSMODULE_H

#include <QJSEngine>
#include <QJSValue>
#include <QJSValueList>
#include <QObject>

#include "../modules/basemodule.h"

#include "../../qnode.h"
#include "../engine/enginecontext.h"

class ProcessModule : public BaseModule {
  Q_OBJECT
 public:
  explicit ProcessModule(QNodeEngineContext* ctx);

  Q_INVOKABLE void nextTick(QJSValue callback, QJSValue args);
  Q_INVOKABLE void send(QJSValue msg);
};

#endif  // PROCESSMODULE_H
