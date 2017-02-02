#include "processmodule.h"

#include "../jsvalueutils.h"

ProcessModule::ProcessModule(QNodeEngineContext* ctx) : BaseModule(ctx) {
  this->jsInstance =
      this->ctx->wrapModule(this, ":/libqnode/js/processWrapper.js");
}

void ProcessModule::nextTick(QJSValue callback, QJSValue args) {
  QJSValueList argList = JSValueUtils::arrayToList(args);

  emit dispatch(callback, argList);
}

void ProcessModule::send(QJSValue msg) { emit ipcMessage(msg); }
