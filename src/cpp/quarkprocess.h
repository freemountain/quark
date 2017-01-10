#ifndef QUARKPROCESS_H
#define QUARKPROCESS_H

#include <QObject>
#include <QQmlApplicationEngine>
#include <QProcessEnvironment>
#include <QString>
#include <QStringList>
#include <QQuickWindow>

#include <QJsonValue>

#include "logger.h"
#include "rootstore.h"

class QuarkProcess : public QObject
{
    Q_OBJECT
public:
    explicit QuarkProcess(QProcessEnvironment, Logger *, QObject*);

public slots:
    void start(QString path, QStringList arguments);
    void terminate();
    void handleCloseQml(QString path);
    void handleLoadQml(QString path);
    void handleWindow(QObject* window, QUrl url);

private:
    QMap<QString, QQuickWindow*>* windows;
    Logger* log;
    QProcess proc;
    QQmlApplicationEngine* qmlEngine;
    RootStore* rootStore;

signals:
    void startProcess(QString path);
    void loadQml(QString url);
    void closeQml(QString url);

private slots:
    void onData();
    void onAction(QString type, QJsonValue payload);
};

#endif // QUARKPROCESS_H
