#include "appcontroller.h"
#include <QDebug>
#include "src/jsvalueutils.h"
AppController::AppController(QObject *parent) : QObject(parent) {
  this->engine = new NodeEngine(this);

  connect(this->engine, &NodeEngine::readyReadStandardOutput, [this]() {
    QString out = this->engine->readAllStandardOutput();
    emit this->stdOut(out);
  });

  connect(this->engine, &NodeEngine::readyReadStandardError, [this]() {
    QString out = this->engine->readAllStandardError();
    emit this->stdErr(out);
  });
}

void AppController::handleSubmitTextField(const int id, const QString &in) {
  QJSValue result = this->engine->evaluate(in);
  qDebug() << "eavluate " << in << ": " << JSValueUtils::stringify(result);

  emit this->result(QVariant(id), QVariant(JSValueUtils::stringify(result)));
}
