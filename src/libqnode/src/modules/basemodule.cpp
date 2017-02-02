#include "basemodule.h"

BaseModule::BaseModule(QNodeEngineContext* ctx) : QObject(ctx->getJsEngine()) {
  this->ctx = ctx;
}

BaseModule* BaseModule::fromJSValue(QNodeEngineContext* ctx, QJSValue value) {
  BaseModule* mod = new BaseModule(ctx);
  mod->jsInstance = value;

  return mod;
}

bool BaseModule::isBusy() { return false; }

QJSValue BaseModule::getJSInstance() { return this->jsInstance; }
