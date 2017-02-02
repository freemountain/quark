#include "testresult.h"
#include <QStringList>

TestResult::TestResult(QString name, bool success, QString msg) {
  this->name = "name";
  this->success = success;
  this->msg = msg;
}

TestResult::TestResult() : TestResult("", false, "") {}

TestResult::TestResult(const TestResult *value) {
  this->name = value->name;
  this->success = value->success;
  this->msg = value->msg;
}

bool TestResult::isSuccess() const { return this->success; }
void TestResult::setSuccess(bool success) { this->success = success; }

QString TestResult::getMessage() const { return this->msg; }
void TestResult::setMessage(QString msg) { this->msg = msg; }

QString TestResult::getName() const { return this->name; }
void TestResult::setName(QString name) { this->name = name; }

TestResult TestResult::createEmpty() { return TestResult("", false, ""); }

QString TestResult::toString() const {
  QString s = QString("%1: %2 %3")
                  .arg(this->name, this->isSuccess() ? "success" : "failure",
                       this->getMessage());

  return s;
}
