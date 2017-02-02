#include "testrunner.h"
#include <QDirIterator>
#include <QTimer>

TestRunner::TestRunner(QObject* parent) : QObject(parent) {
  this->pool = new QThreadPool(this);
  pool->setMaxThreadCount(4);

  connect(this, &TestRunner::_caseFinished, this, &TestRunner::_onCaseFinished);
}

void TestRunner::load(QString path) {
  QDirIterator it(QDir(path).absolutePath());

  while (it.hasNext()) {
    QString current = it.next();
    QString name = QFileInfo(current).fileName();
    if (name == ".." || name == "." || !QFileInfo(current).isDir()) continue;

    TestCase* testCase = new TestCase(current, this);

    this->testCases.insert(current, testCase);
  }
}

int TestRunner::getTestCaseCount() { return this->testCases.size(); }

QHash<QString, TestResult> TestRunner::runSync() {
  QHash<QString, TestResult> results;

  QList<QString> keys = this->testCases.keys();
  foreach (QString key, keys) {
    TestCase* testCase = this->testCases.value(key);
    TestResult testResult = testCase->runSync();
    results.insert(key, testResult);
  }

  return results;
}

void TestRunner::run() {
  QList<QString> keys = this->testCases.keys();
  int max = this->getTestCaseCount();
  QSet<int> returned;
  this->counter = 0;

  for (int i = 0; i < max; i++) {
    QString key = keys.at(i);
    TestCase* testCase = this->testCases.value(key);
    connect(testCase, &TestCase::finished,
            [this, max, i, &returned](TestResult* result) {
              emit this->_caseFinished(result, i + 1, max);
            });
    this->pool->start(testCase);
  }
}

void TestRunner::_onCaseFinished(TestResult* result, int n, int max) {
  emit this->caseFinished(result, n, max);
  this->counter += 1;
  if (this->counter >= max) this->finished();
}

void TestRunner::waitForDone(int s) { this->pool->waitForDone(s); }
