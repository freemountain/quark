#ifndef TESTRESULT_H
#define TESTRESULT_H

#include <QString>

class TestResult {
 public:
  TestResult();
  TestResult(QString name, bool success, QString msg);
  TestResult(const TestResult* value);

  bool isSuccess() const;
  QString getMessage() const;
  QString getName() const;

  void setSuccess(bool success);
  void setMessage(QString msg);
  void setName(QString name);
  static TestResult createEmpty();

  QString toString() const;

 private:
  QString name;
  bool success;
  QString msg;
};

#endif  // TESTRESULT_H
