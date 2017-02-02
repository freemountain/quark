#ifndef JSTEST_H
#define JSTEST_H

#include <QDebug>
#include <QDir>
#include <QDirIterator>
#include <QEventLoop>
#include <QJSEngine>
#include <QtTest>

#include "src/engine/nodeengine.h"
#include "src/jsvalueutils.h"
#include "src/utils.h"

class JSTest : public QObject {
  Q_OBJECT

 public:
  JSTest() {}

 private Q_SLOTS:
  void run_data() {
    QTest::addColumn<QString>("file");
    QDirIterator it(QDir(SRCDIR).absoluteFilePath("jsTests"));

    while (it.hasNext()) {
      QString current = it.next();
      QString name = QFileInfo(current).fileName();
      QString json = current.append("/test.json");

      if (QFileInfo(json).isFile()) {
        QTest::newRow(name.toLatin1().data()) << json;
        continue;
      }
    }
  }

  void run() {
    QFETCH(QString, file);

    QString base = QFileInfo(file).path();
    NodeEngine nodeEngine;
    QEventLoop loop;
    bool failed = false;
    QString msg;

    QJSValue testJson = nodeEngine.parseJson(Utils::readFile(file));
    QJSValue testIpcData = testJson.property("ipc");
    QString main = testJson.property("main").toString();
    bool testIpc = testIpcData.isArray();
    QJSValueList ipcMessages;

    loop.connect(
        &nodeEngine, &NodeEngine::finished,
        [&loop, file, &msg, &failed](const QJSValue& result) {
          if (result.isError()) {
            QString name =
                result.property("constructor").property("name").toString();
            QString stack = result.property("stack").toString();
            QString message = result.property("message").toString();
            msg = QString("%1 failed \n%2 %3:\n%4")
                      .arg(file, name, message, stack);
            failed = true;
          }
          loop.quit();
        });

    connect(&nodeEngine, &NodeEngine::ipcMessage,
            [&ipcMessages](const QJSValue& msg) { ipcMessages << msg; });

    nodeEngine.start(main, base);
    loop.exec();
    QVERIFY2(!failed, msg.toUtf8().data());
    if (!failed && testIpc) {
      QString a = JSValueUtils::stringify(testIpcData);
      QString b = JSValueUtils::stringify(
          JSValueUtils::listToArray(nodeEngine.getEngine(), ipcMessages));
      QCOMPARE(a, b);
    }
  }
};

#endif  // JSTEST_H
