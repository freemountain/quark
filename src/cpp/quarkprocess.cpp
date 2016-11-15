#include "quarkprocess.h"

#include <QDebug>
#include <QCoreApplication>
#include <QFileInfo>
#include <QStandardPaths>
#include <QTimer>
#include <QJsonObject>
#include <QJsonDocument>
#include <QQmlContext>
#include <QProcessEnvironment>

#include "com/cutehacks/gel/gel.h"

QuarkProcess::QuarkProcess(QProcessEnvironment env, QObject *parent) : QObject(parent)
{
    this->qmlEngine = new QQmlApplicationEngine(this);
    this->rootStore = new RootStore(this);

    this->qmlEngine->addImportPath("qrc:/src/qml");
    com::cutehacks::gel::registerEngine(this->qmlEngine);

    this->proc.setReadChannel(QProcess::StandardOutput);
    this->proc.setProcessChannelMode(QProcess::ForwardedErrorChannel);
    this->proc.setProcessEnvironment(env);

    QQmlContext *rootCtx = this->qmlEngine->rootContext();
    rootCtx->setContextProperty("backend", rootStore);

    connect(&this->proc, &QProcess::readyReadStandardOutput, this, &QuarkProcess::onData);
    connect(this->rootStore, &RootStore::action, this, &QuarkProcess::onAction);
    connect(this, &QuarkProcess::loadQml, this, &QuarkProcess::handleLoadQml);

    connect(this->rootStore, &RootStore::data, [this](const QString &line)  {
        this->proc.write(line.toUtf8());
    });
}

void QuarkProcess::onAction(QString type, QJsonValue payload) {
    if(type == "loadQml") {
        QString url = payload.toObject().value("url").toString();
        emit loadQml(url);
    }

    if(type == "startProcess") {
        QString path = payload.toString();
        emit startProcess(path);
    }
}

void QuarkProcess::start(QString cmd, QStringList arguments) {
    this->proc.start(cmd, arguments);
}

void QuarkProcess::onData() {
    while(this->proc.canReadLine()) {
        QString data = QString(this->proc.readLine());
        this->rootStore->writeData(data);
    };
}

void QuarkProcess::terminate() {
    this->proc.terminate();
}

void QuarkProcess::handleLoadQml(QString path) {
    qDebug() << "loadQml: " <<path;
    this->qmlEngine->load(QUrl(path));
}

