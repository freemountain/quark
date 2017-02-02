#include "typedarraymodule.h"
#include <QQmlEngine>

TypedArrayModule::TypedArrayModule(QNodeEngineContext* ctx) : BaseModule(ctx) {
  // qmlRegisterType(JSProxy);
  this->jsInstance =
      this->ctx->wrapModule(this, ":/libqnode/js/typedArrayWrapper.js");
}

QJSValue TypedArrayModule::createByteArrayProxy(int size) {
  QByteArray* byteArray = new QByteArray();
  byteArray->resize(size);
  return this->ctx->getJsEngine()->newQObject(
      ByteArrayProxy::create(size, this));
}
