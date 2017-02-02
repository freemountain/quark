#ifndef COREPROVIDER_H
#define COREPROVIDER_H

#include <QObject>

#include "../../qnode.h"
#include "../engine/enginecontext.h"
#include "../moduleprovider.h"
class CoreProvider : public QObject, public QNodeModuleProvider {
  Q_OBJECT
  Q_INTERFACES(QNodeModuleProvider)

 public:
  explicit CoreProvider(QObject* parent);
  QNodeModule* module(QNodeEngineContext* ctx, QString module);
};

#endif  // COREPROVIDER_H
