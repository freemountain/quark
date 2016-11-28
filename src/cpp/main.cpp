#include <QQmlApplicationEngine>
#include <QGuiApplication>
#include <QtGui/QGuiApplication>
#include <QObject>
#include <QtDebug>

#include "quarkprocess.h"
#include "environment.h"
#include "quarkdebugger.h"
#include "logsource.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);
    QuarkDebugger* debugger = new QuarkDebugger();
    Environment* env = new Environment(app.arguments());
    QuarkProcess* proc;

    debugger->attachLogSource(env);
    debugger->printLine("node:" + env->getCommand("node"));
    debugger->printLine("NODE_PATH" + env->getProcEnv().value("NODE_PATH"));
    debugger->printLine("script:" + env->getScriptPath());
    debugger->printLine("data:" + env->getDataPath().path());
    debugger->printLine("bundled app:" + env->getBundledAppPath());

    if(env->getScriptPath() == "") {
        proc = env->startProcess(env->getBundledAppPath());
        debugger->attach(proc);
    } else {
        proc = env->startProcess(env->getScriptPath());
        debugger->attach(proc);
    }

    return app.exec();
}
