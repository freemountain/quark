#ifndef QUARKENVIRONMENT_H
#define QUARKENVIRONMENT_H

#include <QObject>
#include <QUrl>
#include <QStringList>
#include "quarkplugininfo.h"

class QuarkEnvironment : public QObject {
  Q_OBJECT
    Q_PROPERTY(QString bundleBinPath READ bundleBinPath)
    Q_PROPERTY(QString bundlePluginPath READ bundlePluginPath)
    Q_PROPERTY(QVector<QuarkPluginInfo*> plugins READ plugins)


 public:
  explicit QuarkEnvironment(QObject* parent = nullptr);

  QString bundleBinPath();
  QString bundlePluginPath();
  QVector<QuarkPluginInfo*> plugins();


 static void registerResources(QuarkEnvironment* env);

 private:
  QString m_bundleBinPath;
  QString m_bundlePluginPath;
  QVector<QuarkPluginInfo*> m_plugins;
};

#endif  // QUARKENVIRONMENT_H
