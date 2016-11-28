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

QuarkProcess::QuarkProcess(QProcessEnvironment env, QObject* parent) : QObject(parent)
{
    this->qmlEngine = new QQmlApplicationEngine(this);
    this->rootStore = new RootStore(this);

    this->qmlEngine->addImportPath("qrc:/src/qml");
    com::cutehacks::gel::registerEngine(this->qmlEngine);

    this->proc.setReadChannel(QProcess::StandardOutput);
    this->proc.setProcessChannelMode(QProcess::SeparateChannels);
    this->proc.setProcessEnvironment(env);

    connect(&this->proc, &QProcess::readyReadStandardError, this, &QuarkProcess::onStdErr);
    connect(&this->proc, &QProcess::readyReadStandardOutput, this, &QuarkProcess::onStdOut);


    QQmlContext *rootCtx = this->qmlEngine->rootContext();
    rootCtx->setContextProperty("backend", rootStore);

    connect(this->rootStore, &RootStore::mainAction, this, &QuarkProcess::onMainAction);
    connect(this->rootStore, &RootStore::renderAction,[this](const QString &type, const QJsonValue &payload) {
        emit action(type, payload, QuarkProcess::Source::Main);
    });

    connect(this->rootStore, &RootStore::line, [this](const QByteArray &line)  {
        this->proc.write(line);
    });

    connect(this->rootStore, &RootStore::valueChanged, [this](const QJsonValue &val)  {
        emit value(val);
    });

    connect(this->rootStore, &RootStore::log, [this](const QJSValue &msg)  {
        emit log(msg.toVariant().toString() , "renderer");
    });
}

void QuarkProcess::onMainAction(QString type, QJsonValue payload) {
    if(type == "loadQml") {
        QString url = payload.toObject().value("url").toString();
        this->loadQml(url);
        emit log("loadQml: " + url);
        return;
    }

    if(type == "startProcess") {
        QString path = payload.toString();
        emit startProcess(path);
        return;
    }

    emit action(type, payload, QuarkProcess::Source::Main);
}

void QuarkProcess::start(QString cmd, QStringList arguments) {
    QFileInfo info(cmd);
    if(info.isFile())
        this->proc.start(cmd, arguments);
    else
        emit log("could not find cmd: " + QDir::fromNativeSeparators(cmd));
}

void QuarkProcess::onStdOut() {
    this->proc.setReadChannel(QProcess::StandardOutput);

    while(this->proc.canReadLine()) {
        QString data = QString(this->proc.readLine());
        this->rootStore->writeLine(data);
    };
}

void QuarkProcess::onStdErr() {
    this->proc.setReadChannel(QProcess::StandardError);

    while(this->proc.canReadLine()) {
        QString data = QString(this->proc.readLine());
        emit log(data, "main");
    };
}

void QuarkProcess::terminate() {
    this->proc.terminate();
}

void QuarkProcess::loadQml(QString path) {
    emit log("loadQml: " + path);
    this->qmlEngine->load(QDir::toNativeSeparators(path));
}

