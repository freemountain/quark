#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQuickWindow>
#include "appcontroller.h"

int main(int argc, char *argv[]) {
  QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
  QGuiApplication app(argc, argv);

  QQmlApplicationEngine engine;
  AppController *ctrl = new AppController();

  engine.load(QUrl(QLatin1String("qrc:/main.qml")));

  QObject *topLevel = engine.rootObjects().value(0);
  QQuickWindow *window = qobject_cast<QQuickWindow *>(topLevel);
  // connect our QML signal to our C++ slot



  QObject::connect(window, SIGNAL(submitInput(int, QString)), ctrl,
                   SLOT(handleSubmitTextField(int, QString)));

  QObject::connect(ctrl, SIGNAL(stdOut(QVariant)), window,
                   SLOT(addStdOut(QVariant)));

  QObject::connect(ctrl, SIGNAL(stdErr(QVariant)), window,
                   SLOT(addStdErr(QVariant)));

  QObject::connect(ctrl, SIGNAL(result(QVariant, QVariant)), window,
                   SLOT(addResult(QVariant, QVariant)));

  return app.exec();
}
