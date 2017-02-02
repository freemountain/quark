#include "nativecap.h"

#include <QJSEngine>
NativeCap::NativeCap(QNodeEngineContext* ctx) : QObject(ctx->getJsEngine()) {
  this->ctx = ctx;
  this->jsInstance = ctx->getJsEngine()->newQObject(this);
}

bool NativeCap::isBusy() { return false; }

QJSValue NativeCap::getJSInstance() { return this->jsInstance; }

QString NativeCap::capitalize(QString s) { return s.toUpper(); }
