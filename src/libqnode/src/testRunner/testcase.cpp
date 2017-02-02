#include "testcase.h"
#include <QEventLoop>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>

#include "../../qnode.h"
#include "../engine/nodeengine.h"
#include "../jsvalueutils.h"
#include "../utils.h"

TestCase::TestCase(QString testPath, QObject* parent) : QObject(parent) {
  this->data = TestCaseData::load(testPath);
  this->engine = new NodeEngine(this);
  this->result = data.validate();
  // result->setName("this->data.name");
}

void TestCase::setFinished(TestResult* result) {
  this->result = result;
  emit finished(result);
}

void TestCase::run() { this->runSync(); }
bool TestCase::autoDelete() { return true; }
TestResult* TestCase::runSync() {
  if (!this->result->isSuccess()) {
    return this->result;
  }

  QEventLoop loop;
  connect(this->engine, &NodeEngine::finished,
          [this, &loop](const QJSValue& result) {
            if (result.isError()) {
              this->result->setSuccess(false);
              this->result->setMessage(JSValueUtils::stringify(result));
            }
            loop.quit();
          });

  engine->start(this->data.main, this->data.path);
  loop.exec();
  emit finished(result);
  return this->result;
}
