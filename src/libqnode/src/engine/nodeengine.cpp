#include "nodeengine.h"

#include "../jsvalueutils.h"
#include "../utils.h"

#include <QDebug>

NodeEngine::NodeEngine(QObject* parent) : QObject(parent) {
  this->engine = new QJSEngine(this);
  this->engine->installExtensions(QJSEngine::ConsoleExtension);
  this->loader = new ModuleLoader(this->engine);
  this->ctx = new EngineContext(this, this->loader, this->engine);

  this->loader->setCtx(ctx);
  this->engine->evaluate(Utils::readFile(":/libqnode/js/prelude.js"),
                         "#prelude");
  this->loop = new NodeEventLoop(this->engine);
  this->coreProvider = new CoreProvider(this);

  this->loader->addModuleProvider(this->coreProvider);

  connect(this->loader, &ModuleLoader::loadedNativeModule, this->loop,
          &NodeEventLoop::addNativeModule);

  connect(
      this->loop, &NodeEventLoop::finished,
      [=](const QJSValue& e, const bool& failed) { emit finished(e, failed); });

  connect(this->loop, &NodeEventLoop::ipcMessage, this,
          &NodeEngine::ipcMessage);

  // add globals
  QJSValue global = this->engine->globalObject();
  QJSValue timers = this->loader->require("timers", "").property("exports");
  QJSValue typedArray =
      this->loader->require("typedarray", "").property("exports");

  global.setProperty("global", global);
  global.setProperty("_loader", this->loader->getJSValue());
  global.setProperty("console",
                     this->loader->require("console", "").property("exports"));
  global.setProperty("process",
                     this->loader->require("process", "").property("exports"));
  global.setProperty("setTimeout", timers.property("setTimeout"));
  global.setProperty("clearTimeout", timers.property("clearTimeout"));
  global.setProperty("setInterval", timers.property("setInterval"));
  global.setProperty("clearInterval", timers.property("clearInterval"));
  global.setProperty("setImmediate", timers.property("setImmediate"));
  global.setProperty("clearImmediate", timers.property("clearImmediate"));
  global.setProperty("ArrayBuffer", typedArray.property("ArrayBuffer"));
  global.setProperty("Int8Array", typedArray.property("Int8Array"));
  global.setProperty("Uint8Array", typedArray.property("Uint8Array"));
  global.setProperty("Int16Array", typedArray.property("Int16Array"));
  global.setProperty("Uint16Array", typedArray.property("Uint16Array"));
  global.setProperty("Int32Array", typedArray.property("Int32Array"));
  global.setProperty("Uint32Array", typedArray.property("Uint32Array"));
  global.setProperty("Float32Array", typedArray.property("Float32Array"));
  global.setProperty("Float64Array", typedArray.property("Float64Array"));

  global.setProperty(
      "require", JSValueUtils::createFunction(
                     this->engine,
                     "function require(path) {"
                     " var result = _loader.require(path, process.cwd());"
                     " if(result instanceof Error) throw result;"
                     " if(result === undefined || result === null) throw new "
                     "     Error('Could not find ' + path);"
                     "  return result.exports;"
                     "}"));
}

void NodeEngine::start(QString entry, QString path) {
  QString src = QString(
                    "function main() {"
                    "var result = _loader.require('%1', '%2');"
                    "if(result instanceof Error) throw result;"
                    "if(result === undefined || result === null) throw new "
                    "Error('Could not find %1');"
                    "}")
                    .arg(entry, path);

  QJSValue entrypoint = JSValueUtils::createFunction(this->engine, src, entry);
  if (entrypoint.isError()) {
    emit finished(entrypoint, true);
    return;
  }

  this->loop->postEvent(entrypoint, QJSValueList());
  this->loop->start();
}

QJSValue NodeEngine::parseJson(QString json) {
  QJSValue parser = JSValueUtils::createFunction(this->engine,
                                                 "function(json) {"
                                                 "    return JSON.parse(json);"
                                                 "}",
                                                 "#parseJson");
  return parser.call(QJSValueList() << json);
}

QJSEngine* NodeEngine::getEngine() { return this->engine; }

QString NodeEngine::readAllStandardError() {
  return this->ctx->readAllStandardError();
}

QString NodeEngine::readAllStandardOutput() {
  return this->ctx->readAllStandardOutput();
}

QJSValue NodeEngine::evaluate(QString src) {
  QJSValue result = this->engine->evaluate(src);
  this->loop->start();

  return result;
}
