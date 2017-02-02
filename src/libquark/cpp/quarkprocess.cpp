#include "quarkprocess.h"

#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QProcessEnvironment>
#include <QQmlContext>
#include <QStandardPaths>
#include <QTimer>

#include <gel/gel.h>

#ifdef STATIC_BUILD
  #include <QtPlugin>
  Q_IMPORT_PLUGIN(QtQuick2Plugin)
  Q_IMPORT_PLUGIN(QtQuickControls1Plugin)
  Q_IMPORT_PLUGIN(QtQuickLayoutsPlugin)
  Q_IMPORT_PLUGIN(QtQuick2DialogsPlugin)
  Q_IMPORT_PLUGIN(QtQuick2WindowPlugin)
  Q_IMPORT_PLUGIN(QmlFolderListModelPlugin)
  Q_IMPORT_PLUGIN(QmlSettingsPlugin)
  Q_IMPORT_PLUGIN(QtQuick2DialogsPrivatePlugin)
  Q_IMPORT_PLUGIN(QtQuick2PrivateWidgetsPlugin)
  Q_IMPORT_PLUGIN(QtQuickControls2Plugin)
  Q_IMPORT_PLUGIN(QtQuickControls2MaterialStylePlugin)
  Q_IMPORT_PLUGIN(QtQuickTemplates2Plugin)
#endif

QuarkProcess::QuarkProcess(QProcessEnvironment env, Logger *log,
                           QObject *parent)
    : QObject(parent) {

  Q_INIT_RESOURCE(qml);

  this->log = log;
  this->qmlEngine = new QQmlApplicationEngine(this);
  this->rootStore = new RootStore(this);

  this->qmlEngine->addImportPath("qrc:/qml");
  com::cutehacks::gel::registerEngine(this->qmlEngine);

  this->proc.setReadChannel(QProcess::StandardOutput);
  this->proc.setProcessChannelMode(QProcess::ForwardedErrorChannel);
  this->proc.setProcessEnvironment(env);

  QQmlContext *rootCtx = this->qmlEngine->rootContext();
  rootCtx->setContextProperty("backend", rootStore);

  connect(&this->proc, &QProcess::readyReadStandardOutput, this,
          &QuarkProcess::onData);
  connect(this->rootStore, &RootStore::action, this, &QuarkProcess::onAction);
  connect(this, &QuarkProcess::loadQml, this, &QuarkProcess::handleLoadQml);
  /*connect(&this->proc, &QProcess::errorOccurred, [ out ](const
  QProcess::ProcessError &error)  {
      //out << QString("process error \n");
      out.flush();
  });*/
  connect(this->rootStore, &RootStore::data,
          [this](const QString &line) { this->proc.write(line.toUtf8()); });
}

void QuarkProcess::onAction(QString type, QJsonValue payload) {
  if (type == "loadQml") {
    QString url = payload.toObject().value("url").toString();
    emit loadQml(url);
  }

  if (type == "startProcess") {
    QString path = payload.toString();
    emit startProcess(path);
  }
}

void QuarkProcess::start(QString cmd, QStringList arguments) {
  QFileInfo info(cmd);
  if (info.isFile())
    this->proc.start(cmd, arguments);
  else
    this->log->printLine("could not find cmd: " +
                         QDir::fromNativeSeparators(cmd));
}

void QuarkProcess::onData() {
  while (this->proc.canReadLine()) {
    QString data = QString(this->proc.readLine());
    this->rootStore->writeData(data);
  };
}

void QuarkProcess::terminate() { this->proc.terminate(); }

void QuarkProcess::handleLoadQml(QString path) {
  this->log->printLine("loadQml: " + path);
  this->qmlEngine->load(QDir::toNativeSeparators(path));
}
