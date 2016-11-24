#include "quarkprocess.h"

#include <QCoreApplication>
#include <QFileInfo>
#include <QStandardPaths>
#include <QTimer>
#include <QJsonObject>
#include <QJsonDocument>
#include <QQmlContext>
#include <QProcessEnvironment>

#include "com/cutehacks/gel/gel.h"

QuarkProcess::QuarkProcess(QProcessEnvironment env, Logger *log, QObject* parent) : QObject(parent)
{
    this->log = log;
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
    /*connect(&this->proc, &QProcess::errorOccurred, [ out ](const QProcess::ProcessError &error)  {
        //out << QString("process error \n");
        out.flush();
    });*/
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
    QFileInfo info(cmd);
    if(info.isFile())
        this->proc.start(cmd, arguments);
    else
        this->log->printLine("could not find cmd: " + QDir::fromNativeSeparators(cmd));
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
    this->log->printLine("loadQml: " + path);
    this->qmlEngine->load(QDir::toNativeSeparators(path));
}

