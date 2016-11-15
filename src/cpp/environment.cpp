#include "environment.h"

#include <QCoreApplication>
#include <QFileInfo>
#include <QDir>
#include <QUrl>
#include <QTextStream>
#include <QStringList>
#include <QJsonObject>
#include <QJsonDocument>
#include <QDebug>
#include <QStandardPaths>
#include <QFileInfo>

Environment::Environment(QStringList args, QObject *parent) : QObject(parent)
{
    this->parser = new QCommandLineParser();
    this->env = QProcessEnvironment::systemEnvironment();

    parser->setApplicationDescription("Test helper");
    parser->addHelpOption();
    parser->addPositionalArgument("script", "script");

    parser->process(args);
}

QString Environment::getShell() {
    return env.value("SHELL", "/bin/bash");
}

QString Environment::getBundledCommand(QString name) {
    QString binPath = QFileInfo( QCoreApplication::applicationFilePath() ).absolutePath();
    QString path = binPath + "/" + name;
    QFileInfo info = QFileInfo(path);

    if(info.exists() && info.isFile()) return path;

    return NULL;
}

QString Environment::getSystemCommand(QString name) {
    QString files[] = {"/bin/", "/usr/bin/", "/usr/local/bin/"};

    for( unsigned int i = 0; i < sizeof(files); i = i + 1 )
    {
        QString current = files[i] + name;
        QFileInfo info = QFileInfo(current);
        bool isFile = info.exists() && info.isFile();
        if(isFile) return current;
    }

    return NULL;
}

QString Environment::getCommand(QString name) {
    QString envCmd = this->env.value("QUARK_CMD_" + name.toUpper(), NULL);

    if(envCmd != NULL) return envCmd;

    QString bundledCmd = this->getBundledCommand(name);

    if(bundledCmd != NULL) return bundledCmd;

    QString shellCmd = this->getShellCommand(name);

    if(shellCmd != NULL) return shellCmd;

    return this->getSystemCommand(name);
}

QString Environment::getShellCommand(QString name) {
    QProcess proc;
    QString cmd = "which " + name;
    proc.start(this->getShell(), QStringList() << "-c" << cmd);

    if (!proc.waitForStarted()) {
        qDebug() << "not started";
        return nullptr;
    }

    if (!proc.waitForFinished()) {
        qDebug() << "not finished";
            return nullptr;
    }

    QString result =  proc.readAll(); // contains \n
    int n = result.size() - 1;
    return result.left(n);
}

QString Environment::getConfigPath() {
    return QStandardPaths::writableLocation(QStandardPaths::ConfigLocation);
}

QDir Environment::getDataPath() {
    QString base = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QString dir = QDir(base).filePath("data");

    return QDir(dir);
}

QString Environment::getBundledAppPath() {
    QString binPath = QFileInfo( QCoreApplication::applicationFilePath() ).absolutePath();

    return binPath + "/../Resources/app/package.json";
}

QString Environment::getScriptPath() {
    QStringList args = this->parser->positionalArguments();
    QString envPath = this->env.value("QUARK_SCRIPT", NULL);

    if(args.size() > 0) return args.at(0);

    return envPath;
}

QProcessEnvironment Environment::getProcEnv() {
    QProcessEnvironment procEnv = QProcessEnvironment(this->env);
    QString nodePath = QDir( QCoreApplication::applicationFilePath() + "/../../Resources/" ).absoluteFilePath("node_path");
    procEnv.insert("NODE_PATH", nodePath);

    return procEnv;
}

QuarkProcess* Environment::startProcess() {
    return this->startProcess(this->getScriptPath());
}

QuarkProcess* Environment::startProcess(QString path) {
    Either<QMap<QString, QString>, QJsonParseError> mayJson = this->loadJson(path);

    if(mayJson.is2nd()) {
        qDebug() << "Could not parse: " << path <<
                    "error: " << mayJson.as2nd().errorString();

        return nullptr;
    }

    QMap<QString, QString> json = mayJson.as1st();

    QString main = json.value("main");
    QString name = json.value("name");

    QStringList arguments = QStringList() << main
               << "--dataPath" << this->getDataPath().filePath(name)
               << "--configPath" << this->getConfigPath()
               << "--shellPath" << QCoreApplication::applicationFilePath();

    QuarkProcess* proc = new QuarkProcess(this->getProcEnv(), this);

    if(json.contains("initialQml")) proc->handleLoadQml(json.value("initialQml"));

    connect(proc, &QuarkProcess::startProcess, [this](const QString &path)  {
        this->startProcess(path);
    });

    proc->start(this->getCommand("node"), arguments);

    return proc;
}

Either<QMap<QString, QString>, QJsonParseError> Environment::loadJson(QString path) {
    QString data;
    QString main;
    QString initialQml;
    QJsonObject json;
    QFile file(path);
    QJsonParseError err;
    QMap<QString, QString> result;
    QDir baseDir = QDir(QFileInfo(path).path());

    file.open(QIODevice::ReadOnly | QIODevice::Text);
    data = file.readAll();
    json = QJsonDocument::fromJson(data.toUtf8(), &err).object();

    if(err.error != QJsonParseError::NoError) {
        qDebug() << "Could not parse: " << path <<
                    "error: " << err.errorString();
        return some(err);
    }

    main = json.value("main").toString("main.js");
    initialQml = json.value("initialQml").toString("");

    if(initialQml != "") {
        result.insert("initialQml", QDir::cleanPath(baseDir.absolutePath() + QDir::separator() + initialQml));
    }

    result.insert("main", baseDir.filePath(main));
    result.insert("name", json.value("name").toString(hashPath(path)));

    return some(result);
}

QString Environment::hashPath(QString path) {
    const char * s = path.toStdString().c_str();
    uint32_t hash = 0;

    for(; *s; ++s)
    {
        hash += *s;
        hash += (hash << 10);
        hash ^= (hash >> 6);
    }

    hash += (hash << 3);
    hash ^= (hash >> 11);
    hash += (hash << 15);

    return QString::number(hash);
}
