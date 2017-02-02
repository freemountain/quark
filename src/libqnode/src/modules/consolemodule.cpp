#include "consolemodule.h"

ConsoleModule::ConsoleModule(QNodeEngineContext *ctx) : BaseModule(ctx) {
  this->jsInstance =
      this->ctx->wrapModule(this, ":/libqnode/js/consoleWrapper.js");
}

void ConsoleModule::log(QString msg) {
  this->ctx->writeStandardOutput(msg.append("\n"));
  this->ctx->flushStandardOutput();
}

void ConsoleModule::error(QString msg) {
  this->ctx->writeStandardError(msg.append("\n"));
  this->ctx->flushStandardError();
}
