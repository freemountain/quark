#ifndef JSVALUEUTILS_H
#define JSVALUEUTILS_H

#include <QJSEngine>
#include <QJSValue>
#include <QString>
#include <QStringList>

class JSValueUtils {
 public:
  JSValueUtils();

  static QString stringify(QJSValue value);
  static QString stringifyProps(QJSValue value,
                                QStringList filter = QStringList(),
                                bool filterNumeric = false);
  static QJSValue createValue(QJSEngine* engine, QString src);
  static QJSValue createFunction(QJSEngine* engine, QString src,
                                 QString path = "@createFunction");
  static QJSValue createError(QJSEngine* engine, QString msg,
                              QString stack = "[]");
  static QJSValue loadModule(QJSEngine* engine, QJSValue loader, QString path);
  static QJSValue wrapModule(QJSEngine* engine, QJSValue module,
                             QString wrapper);
  static QJSValue wrapModule2(QJSEngine* engine, QJSValue module,
                              QString wrapperSrc,
                              QJSValueList args = QJSValueList());
  static QJSValueList arrayToList(QJSValue array);
  static QJSValue listToArray(QJSEngine* engine, QJSValueList list);

  static bool isError(QJSEngine* engine, QJSValue error);
  static bool isError2(QJSEngine* engine, QJSValue error);

  static QJSValue call(QJSEngine* engine, QJSValue f, QJSValueList args,
                       bool* failed);
};

#endif  // JSVALUEUTILS_H
