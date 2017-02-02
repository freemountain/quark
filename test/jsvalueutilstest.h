#ifndef JSVALUEUTILSTEST_H
#define JSVALUEUTILSTEST_H
#include <QCoreApplication>
#include <QDebug>
#include <QJSEngine>
#include <QJSValue>
#include <QString>
#include <QtTest>

#include "src/jsvalueutils.h"

class JSValueUtilsTest : public QObject {
  Q_OBJECT

 public:
  JSValueUtilsTest() {
    this->engine = new QJSEngine();
    this->engine->installExtensions(QJSEngine::ConsoleExtension);
  }

 private:
  QJSEngine* engine;

 private Q_SLOTS:
  void initTestCase() {}
  void cleanupTestCase() {}

  void testStringify_data() {
    QTest::addColumn<QString>("value");
    QTest::addColumn<QString>("result");

    // QTest::newRow("function") << "var f = function f(){}; return {f:f};" <<
    // "[Function: f]";
    // QTest::newRow("function") << "return function(){};" << "[Function]";
    QTest::newRow("undefined") << "return undefined;"
                               << "undefined";
    QTest::newRow("null") << "return null;"
                          << "null";
    QTest::newRow("integer") << "return 3;"
                             << "3";
    QTest::newRow("float") << "return 0.1;"
                           << "0.1";
    QTest::newRow("string") << "return \"dsd\";"
                            << "\"dsd\"";
    QTest::newRow("boolean") << "return true;"
                             << "true";
    QTest::newRow("boolean") << "return false;"
                             << "false";
    QTest::newRow("empty object") << "return {};"
                                  << "{}";
    QTest::newRow("simple object") << "return {n: 1};"
                                   << "{n: 1}";
    QTest::newRow("nested object") << "return {f: 1.1, 'o': {'d': 5}};"
                                   << "{f: 1.1, o: {d: 5}}";

    QTest::newRow("empty array") << "return [];"
                                 << "[]";

    QTest::newRow("nested array") << "return [1, [true, false]];"
                                  << "[1, [true, false]]";
    QTest::newRow("simple array") << " return[0, true, 'hi', 9.8];"
                                  << "[0, true, \"hi\", 9.8]";

    QTest::newRow("sparse array")
        << "var a = []; a[0] = 0; a[4] = 4; a[5] = 5; a[6] = 6; return a;"
        << "[0, , , , 4, 5, 6]";

    QTest::newRow("array with properties")
        << "var a = [true, false]; a['foo'] = 'bar'; return a;"
        << "[true, false, foo: \"bar\"]";

    QTest::newRow("object") << "return {foo: 'bar', z: 4.6, a: []};"
                            << "{a: [], foo: \"bar\", z: 4.6}";

    QTest::newRow("error") << "var a = new Error(); return a;"
                           << "{}";
  }

  void testStringify() {
    QFETCH(QString, value);
    QFETCH(QString, result);

    QJSValue jsValue = JSValueUtils::createValue(this->engine, value);
    QCOMPARE(JSValueUtils::stringify(jsValue), result);
  }

  void testArraytoList() {
    QJSValue a = JSValueUtils::createValue(this->engine,
                                           "var a = [{},true,3];"
                                           "a[4] = 'last'; return a;");
    QJSValueList list = JSValueUtils::arrayToList(a);

    QCOMPARE(5, list.length());

    QVERIFY(list.at(0).isObject());
    QVERIFY(list.at(1).toBool());
    QCOMPARE(3, list.at(2).toInt());
    QVERIFY(list.at(3).isUndefined());
    QCOMPARE(QString("last"), list.at(4).toString());
  }

  void testCreateFunction() {
    QString src("function(){ return 1;}");
    QJSValue f = JSValueUtils::createFunction(this->engine, src, "@");
    QVERIFY(f.isCallable());
    QJSValue result = f.call(QJSValueList());
    QVERIFY(result.isNumber());
    QVERIFY(result.toNumber() == 1);
  }

  void testCreateError() {
    QJSValue error =
        JSValueUtils::createError(this->engine, "my msg", "['myStack']");
    QVERIFY(error.isError());
    QCOMPARE(QString("my msg"), error.property("msg").toString());
  }
};

#endif  // JSVALUEUTILSTEST_H
