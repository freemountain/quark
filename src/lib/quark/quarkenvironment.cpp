#include "quarkenvironment.h"

#include <QCoreApplication>
#include <QFileInfo>
#include <QDir>
#include <QDirIterator>
#include <QDebug>
#include <QResource>

QuarkEnvironment::QuarkEnvironment(QObject* parent) : QObject(parent) {
    QString bundlePath = QFileInfo(QCoreApplication::applicationDirPath()).dir().absolutePath();
    this->m_bundleBinPath = QCoreApplication::applicationDirPath();
    this->m_bundlePluginPath = bundlePath + QDir::separator() + "PlugIns";

    this->m_plugins = QuarkPluginInfo::fromDir(this->m_bundlePluginPath);

    foreach(QuarkPluginInfo* info, this->m_plugins) qDebug() << info;
}


QString QuarkEnvironment::bundleBinPath() {
    return this->m_bundleBinPath;
}

QString QuarkEnvironment::bundlePluginPath() {
    return this->m_bundlePluginPath;
}

QVector<QuarkPluginInfo*> QuarkEnvironment::plugins() {
    return this->m_plugins;
}


void QuarkEnvironment::registerResources(QuarkEnvironment *env) {
    foreach (QuarkPluginInfo* plugin, env->plugins()) {
        foreach(QString rccFile, plugin->resources()) {
            QResource::registerResource(rccFile, "/"+ plugin->name());
        }
    }
}
