#include "coreprovider.h"

#include <QDebug>
#include <QJSValue>

#include "consolemodule.h"
#include "fsmodule.h"
#include "processmodule.h"
#include "timermodule.h"
#include "typedarraymodule.h"
#include "utilmodule.h"

#include "../jsvalueutils.h"
#include "../utils.h"

CoreProvider::CoreProvider(QObject* parent) : QObject(parent) {}

QNodeModule* CoreProvider::module(QNodeEngineContext* ctx, QString module) {
  if (module == "process") {
    ProcessModule* proc = new ProcessModule(ctx);
    QNodeModule* mod = qobject_cast<QNodeModule*>(proc);
    return mod;
  }

  if (module == "typedarray") {
    TypedArrayModule* tp = new TypedArrayModule(ctx);
    QNodeModule* mod = qobject_cast<QNodeModule*>(tp);
    return mod;
  }

  if (module == "timers") {
    TimerModule* timer = new TimerModule(ctx);
    QNodeModule* mod = qobject_cast<QNodeModule*>(timer);
    return mod;
  }

  if (module == "console") {
    ConsoleModule* console = new ConsoleModule(ctx);
    QNodeModule* mod = qobject_cast<QNodeModule*>(console);
    return mod;
  }

  if (module == "util") {
    UtilModule* util = new UtilModule(ctx);
    QNodeModule* mod = qobject_cast<QNodeModule*>(util);
    return mod;
  }

  if (module == "fs") {
    FsModule* fs = new FsModule(ctx);
    QNodeModule* mod = qobject_cast<QNodeModule*>(fs);
    return mod;
  }

  if (module == "assert") {
    QJSValue jsMod = ctx->require(":/libqnode/js/assertModule.js");
    return BaseModule::fromJSValue(ctx, jsMod);
  }

  return nullptr;
}
