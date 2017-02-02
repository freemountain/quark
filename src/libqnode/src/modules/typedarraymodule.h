#ifndef TYPEDARRAYMODULE_H
#define TYPEDARRAYMODULE_H

#include <QByteArray>
#include <QDataStream>
#include <QObject>
#include "../../qnode.h"
#include "../modules/basemodule.h"
#include "../utils.h"

class ByteArrayProxy : public QObject {
  Q_OBJECT
 public:
  explicit ByteArrayProxy(QByteArray* byteArray, QObject* parent = 0)
      : QObject(parent) {
    this->byteArray = byteArray;
    this->stream =
        new QDataStream(byteArray, QIODevice::OpenModeFlag::ReadWrite);
  }

  Q_INVOKABLE unsigned int get(int i) {
    unsigned int data = 0;
    return _get(i, data);
  }
  Q_INVOKABLE int set(int i, unsigned int data) { return _set(i, data); }

  // Int8, [bytes] 1,
  Q_INVOKABLE int getInt8(int offset) {
    int8_t result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE int setInt8(int offset, int data) {
    return _set(offset, (int8_t)data);
  }

  // Uint8, [bytes] 1,
  Q_INVOKABLE int getUint8(int offset) {
    uint8_t result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE int setUint8(int offset, int data) {
    return _set(offset, (uint8_t)data);
  }

  // Int16, [bytes] 2,
  Q_INVOKABLE int getInt16(int offset) {
    int16_t result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE int setInt16(int offset, int data) {
    return _set(offset, (int16_t)data);
  }

  // Uint16, [bytes] 2,
  Q_INVOKABLE int getUint16(int offset) {
    uint16_t result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE int setUint16(int offset, int data) {
    return _set(offset, (uint16_t)data);
  }

  // Int32, [bytes] 4,
  Q_INVOKABLE int getInt32(int offset) {
    int32_t result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE int setInt32(int offset, int data) {
    return _set(offset, (int32_t)data);
  }

  // Uint32, [bytes] 4,
  Q_INVOKABLE int getUint32(int offset) {
    uint32_t result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE int setUint32(int offset, int data) {
    return _set(offset, (uint32_t)data);
  }

  // Float64, [bytes] 8,
  Q_INVOKABLE double getFloat64(int offset) {
    double result = 0;
    return _get(offset, result);
  }

  Q_INVOKABLE double setFloat64(int offset, double data) {
    return _set(offset, data);
  }

  static ByteArrayProxy* create(int size, QObject* parent = 0) {
    QByteArray* byteArray = new QByteArray();
    byteArray->resize(size);
    byteArray->fill(0x00);
    ByteArrayProxy* proxy = new ByteArrayProxy(byteArray, parent);

    return proxy;
  }

 private:
  QByteArray* byteArray;
  QDataStream* stream;
  template <typename T>
  T _get(int offset, T data) {
    this->stream->device()->reset();
    this->stream->skipRawData(offset);
    this->stream->operator>>(data);

    return data;
  }

  template <typename T>
  T _set(int offset, T data) {
    this->stream->device()->reset();
    this->stream->skipRawData(offset);
    this->stream->operator<<(data);

    return data;
  }
};

class TypedArrayModule : public BaseModule {
  Q_OBJECT

 public:
  explicit TypedArrayModule(QNodeEngineContext* ctx);

  Q_INVOKABLE QJSValue createByteArrayProxy(int size);
};

#endif  // TYPEDARRAYMODULE_H
