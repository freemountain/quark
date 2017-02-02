#ifndef TESTCASE_H
#define TESTCASE_H

#include <QObject>
#include <QRunnable>
#include "../utils.h"

#include "../engine/nodeengine.h"
#include "testresult.h"

#include <QJsonDocument>
#include <QJsonObject>

class TestCaseData {
 public:
  TestCaseData() {
    this->main = "test.js";
    this->checkStdOut = false;
    this->expectedStdOut = "";
  }

  static TestCaseData load(QString path) {
    TestCaseData data;
    QString jsonData = Utils::readFile(Utils::resolvePath(path, "test.json"));

    data.path = path;
    data.name.clear();
    QStringList tokens = path.split("/");
    data.name.append(tokens.size() > 0 ? tokens.at(tokens.size() - 1) : path);

    if (jsonData == NULL) {
      data.valid = true;
      return data;
    }

    QJsonParseError* error = nullptr;
    QJsonDocument doc = QJsonDocument::fromJson(jsonData.toUtf8(), error);

    if (error->offset != QJsonParseError::NoError) {
      data.valid = false;
      data.invalidReason = "test.json parse error: " + error->errorString();

      return data;
    }

    QJsonObject json = doc.object();

    if (json.contains("main")) data.main = json.value("main").toString();

    data.main = Utils::resolvePath(path, data.main);

    if (Utils::readFile(data.main) == NULL) {
      data.valid = false;
      data.invalidReason = "coud not find main: " + data.main;

      return data;
    }

    if (json.contains("stdOut") && json.value("stdOut").isString()) {
      data.checkStdOut = true;
      data.expectedStdOut = json.value("stdOut").toString();
    }

    if (json.contains("stdOut") && json.value("stdOut").isArray()) {
      throw "not implemented";
    }

    return data;
  }

  TestResult* validate() {
    TestResult* result = new TestResult();
    result->setSuccess(this->valid);
    result->setName(this->name);
    result->setMessage(this->invalidReason);

    return result;
  }

  bool valid;
  QString invalidReason;
  QString path;
  QString main;
  QString name;

  bool checkStdOut;
  QString expectedStdOut;
};

class TestCase : public QObject, public QRunnable {
  Q_OBJECT
 public:
  explicit TestCase(QString testPath, QObject* parent = 0);
  bool autoDelete();
  void run();

 signals:
  void finished(TestResult* result);
 public slots:
  TestResult* runSync();

 private:
  void setFinished(TestResult* result);
  TestCaseData data;
  NodeEngine* engine;
  TestResult* result;
};

#endif  // TESTCASE_H
