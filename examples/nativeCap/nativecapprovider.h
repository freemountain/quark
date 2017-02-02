#ifndef NATIVECAPPROVIDER_H
#define NATIVECAPPROVIDER_H

#include "qnode.h"

class NativeCapProvider : public QObject, public QNodeModuleProvider {
  Q_OBJECT
  Q_PLUGIN_METADATA(IID "QNodeModuleProvider" FILE "nativeCap.json")
  Q_INTERFACES(QNodeModuleProvider)

 public:
  QNodeModule* module(QNodeEngineContext* ctx, QString module) Q_DECL_OVERRIDE;
};

#endif  // NATIVECAPPROVIDER_H
