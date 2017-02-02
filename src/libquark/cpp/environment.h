#ifndef ENVIRONMENT_H
#define ENVIRONMENT_H

#include <QObject>
#include <QProcessEnvironment>
#include <QString>
#include <QStringList>
#include <QCommandLineParser>
#include <QQmlApplicationEngine>
#include <QMap>
#include <QDir>
#include <QJsonParseError>
#include <QTextStream>

#include "quarkprocess.h"
#include "either.h"
#include "logger.h"

Q_DECLARE_METATYPE(QJsonParseError)


class Environment : public QObject, Logger
{
    Q_OBJECT
public:
    explicit Environment(QStringList = QStringList(), QObject *parent = 0);

    QString getCommand(QString name);
    QString getShellCommand(QString name);
    QString getBundledCommand(QString name);
    QString getSystemCommand(QString name);

    QString getScriptPath();
    QDir getDataPath();
    QString getConfigPath();
    QProcessEnvironment getProcEnv();
    QString getBundledAppPath();

    QuarkProcess* startProcess(QString path);
    QuarkProcess* startProcess();

    void printLine(QString msg);


private:
    QTextStream* out;
    QCommandLineParser* parser;
    QProcessEnvironment env;
    static QString hashPath(QString path);
    static Either<QMap<QString, QString>, QJsonParseError> loadJson(QString path);

};

#endif // ENVIRONMENT_H
