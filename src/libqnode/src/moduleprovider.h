#ifndef MODULEPROVIDER_H
#define MODULEPROVIDER_H

#include <QJSEngine>
#include <QJSValue>
#include <QObject>
#include <QStringList>

#include "nodemodule.h"

class ModuleProvider {
 public:
  virtual NodeModule* module(QString module) = 0;
};

#endif  // MODULEPROVIDER_H
