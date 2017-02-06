#include <QGuiApplication>
#include <QObject>
#include <QQmlApplicationEngine>
#include <QtDebug>
#include <QtGui/QGuiApplication>

#include "environment.h"
#include "quarkprocess.h"

int main(int argc, char* argv[]) {
  QGuiApplication app(argc, argv);

  Environment* env = new Environment(app.arguments());
  QuarkProcess* proc;

  env->printLine("node:" + env->getCommand("node"));
  env->printLine("NODE_PATH" + env->getProcEnv().value("NODE_PATH"));
  env->printLine("script:" + env->getScriptPath());
  env->printLine("data:" + env->getDataPath().path());
  env->printLine("bundled app:" + env->getBundledAppPath());

  qDebug() << app.arguments();
  if (env->getScriptPath() == "") {
    proc = env->startProcess(env->getBundledAppPath());
  } else {
    proc = env->startProcess(env->getScriptPath());
  }

  return app.exec();
}
