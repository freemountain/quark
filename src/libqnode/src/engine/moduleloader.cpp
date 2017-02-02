#include "moduleloader.h"

#include <QDebug>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QIODevice>
#include <QJSValueList>
#include <QPluginLoader>
#include <QString>
#include <QStringList>
#include <QTextStream>
#include <QVariant>

#include <assert.h>

#include "../jsvalueutils.h"
#include "../utils.h"

#include "../modules/coreprovider.h"
#include "../nodemodule.h"

ModuleLoader::ModuleLoader(QJSEngine* engine) : QObject(engine) {
  this->engine = engine;
  this->moduleCache = engine->newObject();
  this->jsLoader = engine->newQObject(this);
}

QJSValue ModuleLoader::require(QString module, QString path) {
  if (inCache(module)) return getCache(module);

  QJSValue loaded = loadCoreModule(module);

  if (loaded.isObject()) return returnModule(loaded, module);

  if (module.startsWith("./") || module.startsWith("../") ||
      module.startsWith("/") || module.startsWith(":")) {
    QString resolvedPath = Utils::resolvePath(path, module);

    if (inCache(resolvedPath)) return getCache(resolvedPath);

    loaded = loadAsFile(resolvedPath);

    if (loaded.isNull()) loaded = loadAsDirectory(resolvedPath);
    if (!loaded.isNull()) return returnModule(loaded, resolvedPath);
  }

  loaded = loadNodeModules(module, Utils::resolvePath(path, "."));

  if (loaded.isNull()) {
    return JSValueUtils::createError(this->engine, "Cannot find module " + path,
                                     "");
  }

  return returnModule(loaded, path);
}

QJSValue ModuleLoader::getCacheProp() { return this->moduleCache; }

QJSValue ModuleLoader::loadAsFile(QString path) {
  if (QFileInfo(path).isFile())
    return JSValueUtils::loadModule(this->engine, this->jsLoader, path);

  if (QFileInfo(path + ".js").isFile())
    return JSValueUtils::loadModule(this->engine, this->jsLoader, path + ".js");

  if (QFileInfo(path + ".qnode").isFile())
    return loadNativeModule(path + ".qnode");

  return QJSValue(QJSValue::SpecialValue::NullValue);
}

QJSValue ModuleLoader::loadAsDirectory(QString path) {
  QJSValue loaded;

  if (QFileInfo(path + "/package.json").isFile()) {
    QJSValue package = loadJSONFile(path + "/package.json");
    QJSValue main = package.property("main");
    QString mainPath = Utils::resolvePath(path, main.toString());
    loaded = loadAsFile(mainPath);

    if (!loaded.isNull()) return loaded;
  }

  if (QFileInfo(path + "/index.js").isFile())
    return JSValueUtils::loadModule(this->engine, this->jsLoader,
                                    path + "/index.js");

  if (QFileInfo(path + "/index.js").isFile())
    return loadJSONFile(path + "/index.json");

  return QJSValue(QJSValue::SpecialValue::UndefinedValue);
  ;
}

QJSValue ModuleLoader::loadNodeModules(QString module, QString path) {
  QStringList dirs = nodeModulesPaths(path);
  QJSValue loaded;

  for (int i = 0; i < dirs.size(); i++) {
    loaded = loadAsFile(dirs.at(0) + "/" + module);
    if (!loaded.isNull()) return loaded;

    loaded = loadAsDirectory(dirs.at(0) + "/" + module);
    if (!loaded.isNull()) return loaded;
  }

  return QJSValue(QJSValue::SpecialValue::UndefinedValue);
}

QJSValue ModuleLoader::loadJSONFile(QString path) {
  QFile file(path);
  if (!file.open(QIODevice::ReadOnly | QIODevice::Text))
    return QJSValue(QJSValue::SpecialValue::UndefinedValue);

  QString contents = file.readAll();
  file.close();
  QString loaderTemplate = QString("JSON.parse('%1')").arg(contents);

  return engine->evaluate(loaderTemplate);
}

QJSValue ModuleLoader::returnModule(QJSValue module, QString path) {
  if (!JSValueUtils::isError(engine, module)) addCache(path, module);

  return module;
}

QStringList ModuleLoader::nodeModulesPaths(QString start) {
  QStringList parts = start.split("/");
  QStringList dirs;

  parts.removeFirst();
  for (int i = parts.size() - 1; i >= 0; i--) {
    if (parts.at(i) == "node_modules") continue;
    QStringList currentDir;
    for (int j = 0; j <= i; j++) currentDir << parts.at(j);
    currentDir << "node_modules";
    dirs << "/" + currentDir.join("/");
  }

  return dirs;
}

QJSValue ModuleLoader::getJSValue() { return this->jsLoader; }

QJSValue ModuleLoader::loadCoreModule(QString path) {
  QNodeModule* result;
  QJSValue jsModule;
  QNodeModuleProvider* current;

  for (int i = 0; i < this->provider.size(); i++) {
    current = this->provider.at(i);
    result = current->module(this->ctx, path);

    if (result == nullptr) continue;

    emit loadedNativeModule(result);

    QJSValue module = this->engine->newObject();

    module.setProperty("exports", result->getJSInstance());
    module.setProperty("id", path);
    module.setProperty("loaded", true);

    return module;
  }

  return QJSValue(QJSValue::NullValue);
}

void ModuleLoader::addModuleProvider(QNodeModuleProvider* provider) {
  this->provider.append(provider);
}

bool ModuleLoader::inCache(QString key) {
  return this->moduleCache.hasOwnProperty(key);
}

void ModuleLoader::addCache(QString key, QJSValue module) {
  return this->moduleCache.setProperty(key, module);
}

QJSValue ModuleLoader::getCache(QString key) {
  if (!inCache(key)) return QJSValue(QJSValue::UndefinedValue);

  return this->moduleCache.property(key);
}

void ModuleLoader::setCtx(QNodeEngineContext* ctx) { this->ctx = ctx; }

QJSValue ModuleLoader::loadNativeModule(QString path) {
  TRACE_METHOD();
  QPluginLoader loader(path);
  QObject* plugin = loader.instance();
  if (!plugin) return QJSValue(QJSValue::NullValue);

  QNodeModuleProvider* providerInterface =
      qobject_cast<QNodeModuleProvider*>(plugin);

  if (!providerInterface) return QJSValue(QJSValue::NullValue);
  QNodeModule* loaded = providerInterface->module(this->ctx, path);

  QJSValue module = engine->newObject();
  module.setProperty("exports", loaded->getJSInstance());

  return module;
}
