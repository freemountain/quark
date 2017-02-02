#include "repl.h"
#include <QDebug>
#include "src/jsvalueutils.h"
REPL::REPL(QNodeEngine* engine, QTextStream* out, QObject* parent)
    : QObject(parent) {
  this->engine = engine;
  this->out = out;

  QObject::connect(dynamic_cast<QObject*>(engine),
                   SIGNAL(readyReadStandardError()), this,
                   SLOT(_readEngineError()));

  QObject::connect(dynamic_cast<QObject*>(engine),
                   SIGNAL(readyReadStandardOutput()), this,
                   SLOT(_readEngineOut()));
}

void REPL::_readEngineError() {
  this->_write(this->engine->readAllStandardError());
}

void REPL::_readEngineOut() {
  this->_write(this->engine->readAllStandardOutput());
}

void REPL::_write(QString data) {
  this->out->operator<<(data);
  this->out->operator<<("\n");
  this->out->flush();
}

QJSValue REPL::evaluate(QString input) {
  // this->_write("<< " + input);
  QJSValue result = this->engine->evaluate(input);
  // this->_write(">> " + result.toVariant().toString());

  this->_write(">> " + JSValueUtils::stringify(result));

  return result;
}
