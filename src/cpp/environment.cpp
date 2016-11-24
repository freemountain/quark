#include "environment.h"

#include <QCoreApplication>
#include <QFileInfo>
#include <QDir>
#include <QUrl>
#include <QTextStream>
#include <QStringList>
#include <QJsonObject>
#include <QJsonDocument>
#include <QStandardPaths>
#include <QFileInfo>

Environment::Environment(QStringList args, QObject *parent) : QObject(parent)
{
    this->out = new QTextStream(stdout);
    this->parser = new QCommandLineParser();
    this->env = QProcessEnvironment::systemEnvironment();

    parser->setApplicationDescription("Test helper");
    parser->addHelpOption();
    parser->addPositionalArgument("script", "script");

    parser->process(args);
}

QString Environment::getBundledCommand(QString name) {
    QString binPath = QFileInfo( QCoreApplication::applicationFilePath() ).absolutePath();
    QString path = binPath + "/" + name;

    #ifdef _WIN32
        path = path + ".exe";
    #endif

    QFileInfo info = QFileInfo(path);

    if(info.exists() && info.isFile()) return QDir::toNativeSeparators(path);

    return NULL;
}

QString Environment::getSystemCommand(QString name) {
    #if defined(__unix__) || defined(__unix) || (defined(__APPLE__) && defined(__MACH__))
        QString files[] = {"/bin/", "/usr/bin/", "/usr/local/bin/"};
        for( unsigned int i = 0; i < 3; i = i + 1 )
        {
            this->printLine("get " + name);
            QString current = files[i] + name;
            QFileInfo info = QFileInfo(current);
            bool isFile = info.exists() && info.isFile();
            if(isFile) return current;
        }
    #endif
    return NULL;
}

QString Environment::getCommand(QString name) {
    QString cmd = NULL;

    QString envCmd = this->env.value("QUARK_CMD_" + name.toUpper(), NULL);    
    if(envCmd != NULL) cmd = QDir::fromNativeSeparators(envCmd);

    QString bundledCmd = this->getBundledCommand(name);
    if(cmd == NULL && bundledCmd != NULL) cmd = bundledCmd;

    QString shellCmd = this->getShellCommand(name);
    if(cmd == NULL && shellCmd != NULL) cmd = shellCmd;

    QString sysCmd = this->getSystemCommand(name);
    if(cmd == NULL && sysCmd != NULL) cmd = sysCmd;

    if(cmd == NULL) return NULL;

    QFileInfo info(cmd);
    return info.isFile() && info.isExecutable() ? cmd : NULL;
}

QString Environment::getShellCommand(QString name) {    
    #if defined(__unix__) || defined(__unix) || (defined(__APPLE__) && defined(__MACH__))
        QProcess proc;
        QString cmd = "which " + name;
        QString shell = env.value("SHELL", "/bin/bash");
        proc.start(shell, QStringList() << "-c" << cmd);

        if (!proc.waitForStarted()) {
            this->printLine("not started");
            return nullptr;
        }

        if (!proc.waitForFinished()) {
            this->printLine("not finished");
                return nullptr;
        }

        QString result =  proc.readAll(); // contains \n
        int n = result.size() - 1;

        return result.left(n);
    #else
        return NULL;
    #endif
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
    QString result = NULL;
    #ifdef _WIN32
    QString binPath = QFileInfo( QCoreApplication::applicationFilePath() ).absolutePath();

    result =  binPath + "/default/package.json";
    #elif __linux__
        QString binPath = QFileInfo( QCoreApplication::applicationFilePath() ).absolutePath();

        result =  binPath + "/default/package.json";
    #elif __APPLE__
        QString binPath = QFileInfo( QCoreApplication::applicationFilePath() ).absolutePath();

        result =  binPath + "/../Resources/default/package.json";
    #endif

    return result;
}

QString Environment::getScriptPath() {
    QStringList args = this->parser->positionalArguments();
    QString envPath = this->env.value("QUARK_SCRIPT", NULL);

    if(args.size() > 0) return args.at(0);

    return envPath;
}

QProcessEnvironment Environment::getProcEnv() {
    QString nodePath = NULL;

    #ifdef _WIN32
        nodePath = QFileInfo(QCoreApplication::applicationFilePath()).absolutePath() + "/node_path";
    #elif __linux__
        nodePath = QFileInfo(QCoreApplication::applicationFilePath()).absolutePath() + "/node_path";
    #elif __APPLE__
        nodePath = QDir( QCoreApplication::applicationFilePath() + "/../../Resources/" ).absoluteFilePath("node_path");
    #endif

    QProcessEnvironment procEnv = QProcessEnvironment(this->env);

    if(nodePath != NULL)
        procEnv.insert("NODE_PATH", QDir::toNativeSeparators(nodePath));
    else
        this->printLine("could not set NODE_PATH\n");

    return procEnv;
}

QuarkProcess* Environment::startProcess() {
    return this->startProcess(this->getScriptPath());
}

QuarkProcess* Environment::startProcess(QString path) {
    Either<QMap<QString, QString>, QJsonParseError> mayJson = this->loadJson(path);

    if(mayJson.is2nd()) {
        this->printLine("Could not parse: " + path +
                    "error: " + mayJson.as2nd().errorString());
        return nullptr;
    }

    QMap<QString, QString> json = mayJson.as1st();

    QString main = json.value("main");
    QString name = json.value("name");

    QStringList arguments = QStringList() << main
               << "--dataPath" << this->getDataPath().filePath(name)
               << "--configPath" << this->getConfigPath()
               << "--shellPath" << QCoreApplication::applicationFilePath();

    QuarkProcess* proc = new QuarkProcess(this->getProcEnv(), this, this);

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
        return some(err);
    }

    main = json.value("main").toString("main.js");
    initialQml = json.value("initialQml").toString("");

    if(initialQml != "") {
        result.insert("initialQml", QDir::toNativeSeparators(baseDir.absolutePath() + "/" + initialQml));
    }

    result.insert("main", QDir::toNativeSeparators(baseDir.absolutePath() + "/" + main));
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

void Environment::printLine(QString msg) {
    this->out->operator <<(msg);
    this->out->operator <<("\n");
    this->out->flush();
}
