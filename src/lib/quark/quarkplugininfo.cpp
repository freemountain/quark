#include "quarkplugininfo.h"

QVector<QuarkPluginInfo*> QuarkPluginInfo::fromDir(QString root) {
    QDir::Filters flags = QDir::Filter::Dirs|QDir::Filter::NoDotAndDotDot|QDir::Filter::Readable;
    QVector<QuarkPluginInfo*> pluginInfos;

    QStringList entries = QDir(root).entryList({}, flags);


    foreach (QString pluginName, entries) {
        QuarkPluginInfo* info = new QuarkPluginInfo(root + QDir::separator() + pluginName, pluginName);
        pluginInfos.append(info);
    }

    return pluginInfos;
}

QVector<QString> QuarkPluginInfo::getResources(QString root) {
        QDir::Filters flags = QDir::Filter::Files|QDir::Filter::NoDotAndDotDot|QDir::Filter::Readable;
        QDir rccRoot(root + QDir::separator() + "rcc");
        if(!rccRoot.exists()) return QVector<QString>();

        QList<QString> rccList = rccRoot.entryList({"*.rcc"}, flags);
        QVector<QString> filesVec(rccList.size());
        foreach(QString rccFile, rccList) filesVec.append(rccRoot.absoluteFilePath(rccFile));

        return filesVec;
    }


QString QuarkPluginInfo::getChildPathOrEmpty(QString root, QString child) {
    QDir childDir = QDir(root);

    return childDir.cd(child) ? childDir.absolutePath() : QString();
}




QDebug operator<<(QDebug dbg, QuarkPluginInfo *plugin) {

    QVector<QString> props;

    if(!plugin->name().isEmpty()) {
        props << ("name: " + plugin->name());
    }

    if(!plugin->rootPath().isEmpty()) {
        props << ("rootPath: " + plugin->rootPath());
    }

    if(!plugin->qmlImportPath().isEmpty()) {
        props << ("qmlImportPath: " + plugin->qmlImportPath());
    }

    if(!plugin->resources().isEmpty()) {
        QString prop("resources: ");
        foreach(QString resource, plugin->resources())
            prop.append(resource + ", ");
        props << prop;
    }

    dbg.nospace() << "QuarkPluginInfo(";
    if(!props.isEmpty()) dbg.nospace() <<"\n";
    foreach(QString prop, props) dbg.nospace().noquote() << prop <<  ";\n";

    dbg.nospace() << ")";

    return dbg.maybeSpace();
}
