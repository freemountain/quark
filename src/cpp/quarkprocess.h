#ifndef QUARKPROCESS_H
#define QUARKPROCESS_H

#include <QObject>
#include <QQmlApplicationEngine>
#include <QProcessEnvironment>
#include <QString>
#include <QStringList>

#include <QJsonValue>

#include "rootstore.h"
#include "logsource.h"


class QuarkProcess : public QObject, public LogSource
{
    Q_OBJECT
    //Q_INTERFACES(LogSource)

public:
    explicit QuarkProcess(QProcessEnvironment, QObject*);
    enum Source {
            Renderer,
            Main
    };

public slots:
    void start(QString path, QStringList arguments);
    void terminate();
    void loadQml(QString path);

private:
    QProcess proc;
    QQmlApplicationEngine* qmlEngine;
    RootStore* rootStore;

signals:
    void startProcess(QString path);
    void log(QString msg, QString topic = "log");
    void action(QString type, QJsonValue payload, Source source);
    void value(QJsonValue value);

private slots:
    void onStdOut();
    void onStdErr();
    void onMainAction(QString type, QJsonValue payload);
};

#endif // QUARKPROCESS_H
