#include "quarkdebugger.h"

#include <QTextStream>
#include <QJsonDocument>
#include <QDebug>

QuarkDebugger::QuarkDebugger(QObject *parent) : QObject(parent)
{
    this->qmlEngine = new QQmlApplicationEngine(this);
    this->qmlEngine->load(QUrl("qrc:/src/qml/Debugger.qml"));

   QObject* obj = this->qmlEngine->rootObjects().at(0);
   this->window = qobject_cast<QQuickWindow *>(obj);
   connect(this, SIGNAL(_logMsg(QVariant, QVariant)), this->window, SLOT(appendLogLine(QVariant, QVariant)));
}

void QuarkDebugger::attachLogSource(LogSource *source, QString topic) {
    connect(dynamic_cast<QObject*>(source), SIGNAL(log(QString, QString)), this, SLOT(printLine(QString, QString)));
}

void QuarkDebugger::attach(QuarkProcess *proc) {
    connect(proc, &QuarkProcess::value, [this](const QJsonValue &val)  {
        QJsonDocument doc = QJsonDocument::fromVariant(val.toVariant());
        printLine(doc.toJson(), "_debugger value");
    });

    connect(proc, &QuarkProcess::action, [this](const QString &type, const QJsonValue &payload, const QuarkProcess::Source &source)  {
        QJsonDocument doc = QJsonDocument::fromVariant(payload.toVariant());
        printLine(payload.toString(), "_debugger action: " + type );
    });

    connect(proc, &QuarkProcess::log, [this](const QString &msg, const QString &topic)  {
        printLine(msg , topic);
    });
}

void QuarkDebugger::printLine(QString msg, QString topic) {
    fprintf(stderr, "%s: %s\n", topic.toStdString().c_str(), msg.toStdString().c_str());
    emit _logMsg(QVariant(msg), QVariant(topic));
}
