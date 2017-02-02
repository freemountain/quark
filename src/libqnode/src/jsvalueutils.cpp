#include "jsvalueutils.h"

#include <QDebug>
#include <QFileInfo>
#include <QJSValueIterator>
#include <QVariant>

#include "utils.h"

JSValueUtils::JSValueUtils() {}

QString JSValueUtils::stringifyProps(QJSValue value, QStringList filter,
                                     bool filterNumeric) {
  QJSValueIterator props(value);
  QString propTemplate = QString("%1: %2");
  QStringList properties;

  while (props.hasNext()) {
    props.next();
    bool isNumeric;
    props.name().toInt(&isNumeric, 10);

    if (filter.contains(props.name()) || (filterNumeric && isNumeric)) continue;
    properties << propTemplate.arg(props.name(), stringify(props.value()));
  }

  if (properties.length() == 0) return "";

  return properties.join(", ");
}

QString JSValueUtils::stringify(QJSValue value) {
  QString propTemplate = QString("%1: %2");

  if (value.isString()) {
    return "\"" + value.toString() + "\"";
  }

  if (value.isBool() || value.isNumber() || value.isNull() ||
      value.isUndefined()) {
    return value.toString();
  }

  if (value.isError()) {
    QString result = value.property("name").toString() + ": " +
                     value.property("message").toString() + "\n";

    QStringList stackLines = value.property("stack").toString().split("\n");

    for (int i = 0; i < stackLines.size(); i++)
      result.append("  at " + stackLines.at(i) + "\n");

    return result;
  }

  if (value.isArray()) {
    QStringList elements;
    QString props = stringifyProps(value, QStringList() << "length", true);
    QJSValueIterator it(value);
    int last = 0;

    while (it.hasNext()) {
      it.next();
      if (it.name() == "length") continue;

      bool isNumeric;
      int index = it.name().toInt(&isNumeric, 10);

      if (!isNumeric) continue;

      int d = (index - last) - 1;
      for (; d > 0; d--) elements << "";

      last = index;
      elements << stringify(it.value());
    }

    if (props != "") {
      elements << props;
    }

    return QString("[%1]").arg(elements.join(", "));
  }

  if (value.isCallable()) {
    QJSValue nameProp = value.property("name");
    QString nameTag = nameProp.isString() ? ": " + nameProp.toString() : "";
    QString props = stringifyProps(value, QStringList() << "length"
                                                        << "prototype"
                                                        << "constructor"
                                                        << "name");

    if (props == "")
      return QString("[Function%1]").arg(nameTag);
    else
      return QString("{ [Function%1] %2}").arg(nameTag, props);
  }

  if (value.isObject() && !value.isArray()) {
    QString props = stringifyProps(value);

    return QString("{%1}").arg(props);
  }

  return "";
}

QJSValue JSValueUtils::createValue(QJSEngine* engine, QString src) {
  QString tmp(
      "(function() {"
      "   return {"
      "       wrapper: function() {"
      "           %1"
      "       }"
      "   };"
      "})()");
  QJSValue wrapped = engine->evaluate(tmp.arg(src));

  return wrapped.property("wrapper").call(QJSValueList());
}

QJSValue JSValueUtils::createFunction(QJSEngine* engine, QString src,
                                      QString path) {
  QString tmp(
      "(function() {"
      "   return {"
      "       wrapper: %1"
      "   };"
      "})()");
  QJSValue wrapped = engine->evaluate(tmp.arg(src), path);

  if (wrapped.isError()) return wrapped;

  return wrapped.property("wrapper");
}

QJSValue JSValueUtils::createError(QJSEngine* engine, QString msg,
                                   QString stack) {
  QString tmpl(
      "function(){ var e = new Error('%1'); e.stack = '%2'; return e;}");
  QJSValue f = createFunction(engine, tmpl.arg(msg, stack));

  return f.call(QJSValueList());
}

QJSValue JSValueUtils::loadModule(QJSEngine* engine, QJSValue loader,
                                  QString path) {
  QString contents = Utils::readFile(path);
  QString dirname = QFileInfo(path).path();
  QJSValue module = engine->newObject();
  QJSValue exports = engine->newObject();
  module.setProperty("exports", exports);

  QString wrappedSrc =
      QString(
          "function(_loader, exports, module, __filename, __dirname){"
          "var require = function require(module){"
          "   var result = _loader.require(module, __dirname);"
          "   if(result instanceof Error) throw result;"
          "   return result.exports;"
          "};"
          "delete _loader;"
          "%1"
          "\n;return module;}")
          .arg(contents);

  QJSValue factory = createFunction(engine, wrappedSrc, path);

  if (factory.isError()) return factory;

  QJSValue result = factory.call(QJSValueList() << loader << exports << module
                                                << path << dirname);

  return module;
}

QJSValue JSValueUtils::wrapModule(QJSEngine* engine, QJSValue module,
                                  QString wrapper) {
  QJSValue f = createFunction(
      engine, wrapper, "#wrapModule: " + module.property("name").toString());

  return f.call(QJSValueList() << module);
}

QJSValueList JSValueUtils::arrayToList(QJSValue array) {
  QJSValueList list;
  QString lengthStr = array.property("length").toString();
  bool isNumeric;
  int length = lengthStr.toInt(&isNumeric, 10);

  if (!isNumeric) return list;

  for (int i = 0; i < length; i++) {
    list << array.property(i);
  }

  return list;
}

QJSValue JSValueUtils::listToArray(QJSEngine* engine, QJSValueList list) {
  QJSValue array = engine->newArray();
  for (int i = 0; i < list.size(); i++) {
    array.setProperty(i, list.at(i));
  }

  return array;
}

QJSValue JSValueUtils::wrapModule2(QJSEngine* engine, QJSValue module,
                                   QString wrapperSrc, QJSValueList args) {
  QJSValueList wrapperArgs;
  QJSValue helper =
      JSValueUtils::createFunction(
          engine, Utils::readFile(":/libqnode/js/moduleHelper.js"),
          "#moduleHelper")
          .call();
  QJSValue wrapper =
      JSValueUtils::createFunction(engine, wrapperSrc, "#moduleWrapper");
  wrapperArgs << module << helper << listToArray(engine, args);

  return wrapper.call(wrapperArgs);
}

bool JSValueUtils::isError(QJSEngine* engine, QJSValue error) {
  if (error.isError()) return true;
  if (isError2(engine, error)) return true;

  QJSValue super = error.property("super_");
  QJSValue prototype = error.prototype();

  return isError(engine, super) || isError(engine, prototype);
}

bool JSValueUtils::isError2(QJSEngine* engine, QJSValue error) {
  QJSValue test = createFunction(
      engine,
      "function(mayError) {"
      " var errorInstance = mayError instanceof Error;"
      " var errorConstructor = mayError.constructor === SyntaxError;"
      " return errorInstance || errorConstructor;"
      "}");

  return test.call(QJSValueList() << error).toBool();
}

QJSValue JSValueUtils::call(QJSEngine* engine, QJSValue f, QJSValueList args,
                            bool* failed) {
  QJSValue argsArray = JSValueUtils::listToArray(engine, args);
  QJSValue wrapper = JSValueUtils::createFunction(
      engine,
      "function(target, args) {"
      "    try {"
      "        var result = target.apply(null, args);"
      "        return { throwed: false, result: result};"
      "    } catch(e) {"
      "        return { throwed: true, result: e};"
      "    }"
      "}",
      "#callWrapper");
  QJSValue result = wrapper.call(QJSValueList() << f << argsArray);
  *failed = result.property("throwed").toBool();
  return result.property("result");
}
