#include "quarkapplicationengine.h"
#include <QFileInfo>
#include <QDir>

QuarkApplicationEngine::QuarkApplicationEngine(QuarkEnvironment *environment) : QQmlApplicationEngine (environment)
{
    this->environment = environment;

    QVector<QuarkPluginInfo*> plugins = this->environment->plugins();
    foreach (QuarkPluginInfo * plugin, plugins) {
       this->addImportPath(plugin->qmlImportPath());
    }

}
