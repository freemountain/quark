#include <QQmlApplicationEngine>
#include <QGuiApplication>
#include <QtGui/QGuiApplication>
#include <QObject>
#include <QtDebug>
#include <QTextStream>

#include "quarkprocess.h"
#include "environment.h"

int main(int argc, char *argv[])
{
    QTextStream out(stderr);
    QGuiApplication app(argc, argv);

    Environment* env = new Environment(app.arguments());
    QuarkProcess* proc;

    out << "\nnode:" << env->getCommand("node");
    out << "\nNODE_PATH" << env->getProcEnv().value("NODE_PATH");
    out << "\nscript:" << env->getScriptPath();
    out << "\ndata:" << env->getDataPath().path();
    out << "\nbundled app:" << env->getBundledAppPath();

    out.flush();
    if(env->getScriptPath() == "") {
        proc = env->startProcess(env->getBundledAppPath());
    } else {
        proc = env->startProcess(env->getScriptPath());
    }

    return app.exec();
}
