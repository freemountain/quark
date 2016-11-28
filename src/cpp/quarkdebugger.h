#ifndef QUARKDEBUGGER_H
#define QUARKDEBUGGER_H
#include <QObject>
#include <QQmlApplicationEngine>
#include <QQuickWindow>
#include <QVariant>

#include "logsource.h"
#include "quarkprocess.h"

class QuarkDebugger : public QObject
{
    Q_OBJECT
public:
    explicit QuarkDebugger(QObject *parent = 0);
    void attachLogSource(LogSource* source, QString topic = "log");
    void attach(QuarkProcess* proc);


private:
    QQmlApplicationEngine* qmlEngine;
    QQuickWindow* window;

public slots:
    void printLine(QString msg, QString topic = "log");

signals:
    void _logMsg(QVariant msg, QVariant topic);
};

#endif // QUARKDEBUGGER_H
