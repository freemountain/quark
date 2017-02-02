#ifndef TESTRUNNER_H
#define TESTRUNNER_H

#include <QHash>
#include <QObject>
#include <QThreadPool>

#include "../testRunner/testcase.h"
#include "../testRunner/testresult.h"

class TestRunner : public QObject {
  Q_OBJECT
 public:
  explicit TestRunner(QObject *parent = 0);
  void load(QString path);
  int getTestCaseCount();
  QHash<QString, TestResult> runSync();
  void run();
  void waitForDone(int s = -1);

 signals:
  void caseFinished(TestResult *result, int n, int max);
  void finished();

  void _caseFinished(TestResult *result, int n, int max);

 private slots:
  void _onCaseFinished(TestResult *result, int n, int max);

 private:
  int counter;
  QThreadPool *pool;
  QList<TestResult> results;
  QHash<QString, TestCase *> testCases;
};

#endif  // TESTRUNNER_H
