#include <QQmlApplicationEngine>
#include <QGuiApplication>
#include <QtGui/QGuiApplication>
#include <QObject>
#include <QtDebug>

#include "quarkprocess.h"
#include "environment.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);

    Environment* env = new Environment(app.arguments());
    QuarkProcess* proc;

    qDebug() << "node:" << env->getCommand("node");
    qDebug() << "script:" << env->getScriptPath();
    qDebug() << "data:" << env->getDataPath().path();

    if(env->getScriptPath() == "") {
        proc = env->startProcess(env->getBundledAppPath());
    } else {
        proc = env->startProcess(env->getScriptPath());
    }

    return app.exec();
}
