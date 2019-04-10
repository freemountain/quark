#ifndef QUARKPLUGININFO_H
#define QUARKPLUGININFO_H

#include <QObject>
#include <QStringList>
#include <QDir>
#include <QVector>
#include <QDebug>

#define ReadOnlyProp(p_type, p_name)  public: \
    Q_PROPERTY(p_type p_name READ p_name CONSTANT) \
    p_type p_name() { return this->m_##p_name; } \
protected: \
    p_type m_##p_name;


class QuarkPluginInfo
{
    Q_GADGET
    ReadOnlyProp(QString, name)
    ReadOnlyProp(QString, rootPath)
    ReadOnlyProp(QString, qmlImportPath)
    ReadOnlyProp(QVector<QString>, resources)


public:
    explicit QuarkPluginInfo(QString root, QString name)
        : m_name(name)
        , m_rootPath(root)
        , m_qmlImportPath(QuarkPluginInfo::getChildPathOrEmpty(root, "qml"))
        , m_resources(QuarkPluginInfo::getResources(root))
    {}


    static QVector<QuarkPluginInfo*> fromDir(QString root);

 private:
    static QVector<QString> getResources(QString root);
    static QString getChildPathOrEmpty(QString root, QString child);
};

QDebug operator<<(QDebug dbg, QuarkPluginInfo *plugin);

#endif // QUARKPLUGININFO_H
