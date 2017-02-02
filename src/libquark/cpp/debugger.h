#ifndef DEBUGGER_H
#define DEBUGGER_H

#include <QObject>
#include <QQmlApplicationEngine>
#include <QQuickItem>
#include <QString>

#include "logger.h"

class DebuggerLogger : public QObject, Logger {
 public:
  DebuggerLogger(QObject* parent = 0) : QObject(parent) {}

  void printLine(QString msg) { emit _log(msg); }
 signals:
  void _log(QString msg);
};

class Debugger : public QObject {
 public:
  Debugger();
  Logger* getLogger();

 private:
  DebuggerLogger* log;
  QQmlApplicationEngine* qmlEngine;
};

#endif  // DEBUGGER_H
