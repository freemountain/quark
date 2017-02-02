#ifndef FSMODULE_H
#define FSMODULE_H

#include <QException>
#include <QFuture>
#include <QFutureWatcher>
#include <QHash>
#include <QList>
#include <QObject>
#include <QTextCodec>

#include "../../qnode.h"
#include "../engine/enginecontext.h"
#include "../nodemodule.h"
#include "../utils.h"
#include "basemodule.h"

class FsException : public QException {
 public:
  explicit FsException(QString msg) { this->msg = msg; }
  void raise() const { throw * this; }
  FsException* clone() const { return new FsException(*this); }
  QString msg;
};

#ifndef Q_DECLARE_METATYPE_QJSValueList
#define Q_DECLARE_METATYPE_QJSValueList
Q_DECLARE_METATYPE(QJSValueList)
#endif

class FsModule : public BaseModule {
  Q_OBJECT
 public:
  explicit FsModule(QNodeEngineContext* ctx);

  Q_INVOKABLE QStringList availableCodecs();
  Q_INVOKABLE void clear(int id);

  Q_INVOKABLE QJSValue readFileSync(QString file, QString encoding,
                                    QString flag = "r");
  Q_INVOKABLE void readFile(QString file, QJSValue cb, QString encoding,
                            QString flag = "r");

  Q_INVOKABLE QJSValue writeFileSync(QString file, QString data,
                                     QString encoding, QString flag = "r");
  Q_INVOKABLE void writeFile(QString file, QString data, QJSValue cb,
                             QString encoding, QString flag = "r");

  static QString readFileEncoded(QString file, QString encoding,
                                 QString flag = "r");
  static void writeFileEncoded(QString file, QString data, QString encoding,
                               QString flag = "r");

  static QIODevice::OpenModeFlag mapFlags(QString flags);
  bool isBusy();

 private:
  int nextId;
  QHash<int, QFutureWatcher<void>*> jobs;

 signals:

 public slots:
};

#endif  // FSMODULE_H
