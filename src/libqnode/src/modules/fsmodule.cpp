#include "fsmodule.h"

#include <QFile>
#include <QtConcurrent>

#include "../jsvalueutils.h"

FsModule::FsModule(QNodeEngineContext* ctx) : BaseModule(ctx) {
  qRegisterMetaType<QJSValueList>();

  this->nextId = 0;
  this->jsInstance = this->ctx->wrapModule(this, ":/libqnode/js/fsWrapper.js");
}

QString FsModule::readFileEncoded(QString file, QString encoding,
                                  QString flag) {
  QFile f(file);
  char* rawEncoding = encoding.toUtf8().data();

  if (QTextCodec::codecForName(rawEncoding) == NULL)
    throw FsException("Unknown encoding: " + encoding);

  if (!f.open(mapFlags(flag)))
    throw FsException("ENOENT: no such file or directory, open " + file);

  if (!f.isOpen()) throw FsException("Could not open " + file);
  if (!f.isReadable())
    throw FsException("File " + file + " is not opened in read mode");

  QTextStream in(&f);
  in.setAutoDetectUnicode(false);
  // using rawEncoding as argument to setCodec has no effect, why???
  in.setCodec(encoding.toUtf8().data());

  return in.readAll();
}

void FsModule::writeFileEncoded(QString file, QString data, QString encoding,
                                QString flag) {
  QFileInfo info(file);
  QFile f(file);
  QIODevice::OpenModeFlag openMode = mapFlags(flag);
  char* rawEncoding = encoding.toUtf8().data();

  if (QTextCodec::codecForName(rawEncoding) == NULL)
    throw FsException("FSERROR: Unknown encoding: " + encoding);

  if (info.isDir())
    throw FsException("EISDIR: illegal operation on a directory, open " + file);

  if (openMode == QIODevice::OpenModeFlag::ReadOnly)
    throw FsException("FSERROR: flags are read only. flags: " + flag);

  f.open(mapFlags(flag));

  if (!f.isOpen()) throw FsException("Could not open " + file);

  if (!f.isWritable())
    throw FsException("FSERROR: File " + file + " is not opened in write mode");

  QTextStream out(&f);

  out.setAutoDetectUnicode(false);
  out.setCodec(encoding.toUtf8().data());
  out << data;
}

QJSValue FsModule::readFileSync(QString file, QString encoding, QString flag) {
  QJSValue result;
  try {
    QString data = readFileEncoded(file, encoding, flag);
    result = QJSValue(data);
  } catch (FsException e) {
    result = JSValueUtils::createError(this->ctx->getJsEngine(), e.msg, "");
  } catch (QException e) {
    throw e;
  }

  return result;
}

QJSValue FsModule::writeFileSync(QString file, QString data, QString encoding,
                                 QString flag) {
  QJSValue result;

  try {
    writeFileEncoded(file, data, encoding, flag);
    result = QJSValue(QJSValue::NullValue);
  } catch (FsException e) {
    result = JSValueUtils::createError(this->ctx->getJsEngine(), e.msg, "");
  } catch (QException e) {
    TRACE_METHOD();
    throw e;
  }

  return result;
}

void FsModule::readFile(QString file, QJSValue cb, QString encoding,
                        QString flag) {
  int id = nextId++;
  QFutureWatcher<void>* watcher = new QFutureWatcher<void>();
  QFuture<void> future =
      QtConcurrent::run([file, cb, encoding, flag, this, id]() {
        QJSValueList cbArguments;
        QJSValue undefined = QJSValue(QJSValue::UndefinedValue);
        try {
          QString data = readFileEncoded(file, encoding, flag);
          cbArguments << undefined << QJSValue(data);
        } catch (FsException e) {
          cbArguments << e.msg << undefined;
        }

        emit this->dispatch(cb, cbArguments << id);
      });

  watcher->setFuture(future);
  jobs.insert(id, watcher);
}

void FsModule::writeFile(QString file, QString data, QJSValue cb,
                         QString encoding, QString flag) {
  int id = nextId++;
  QFutureWatcher<void>* watcher = new QFutureWatcher<void>();
  QFuture<void> future =
      QtConcurrent::run([file, cb, encoding, flag, this, id, data]() {
        QJSValueList cbArguments;
        QJSValue undefined = QJSValue(QJSValue::UndefinedValue);
        try {
          writeFileEncoded(file, data, encoding, flag);
          cbArguments << undefined;
        } catch (FsException e) {
          cbArguments << e.msg;
        }

        emit this->dispatch(cb, cbArguments << id);
      });

  watcher->setFuture(future);
  jobs.insert(id, watcher);
}

bool FsModule::isBusy() { return jobs.size() > 0; }

void FsModule::clear(int id) { jobs.remove(id); }

QStringList FsModule::availableCodecs() {
  QStringList result;
  QList<QByteArray> codecs = QTextCodec::availableCodecs();

  for (int i = 0; i < codecs.count(); ++i) {
    QByteArray current = codecs.at(i);
    result.append(QString(current));
  }
  return result;
}

QIODevice::OpenModeFlag FsModule::mapFlags(QString flags) {
  if (flags == "r") return QIODevice::OpenModeFlag::ReadOnly;
  if (flags == "w") return QIODevice::OpenModeFlag::WriteOnly;
  if (flags == "rw" || flags == "wr") return QIODevice::OpenModeFlag::ReadWrite;

  throw FsException("Unknown flag: " + flags);
}
