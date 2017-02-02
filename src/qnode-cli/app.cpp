#include "app.h"

#include <QDebug>
#include <QDir>
#include <QJSEngine>
#include <QJSValueIterator>
#include <QObject>
#include <QSocketNotifier>
#include "qnode.h"
#include "repl.h"
#include "src/engine/moduleloader.h"
#include "src/engine/nodeengine.h"
#include "src/jsvalueutils.h"
#include "src/utils.h"

App::App(int& argc, char* argv[])
    : QCoreApplication(argc, argv)

{
  this->out = new QTextStream(stdout);
  this->err = new QTextStream(stderr);

  this->engine = new NodeEngine(this);
}

int App::exec() {
  if (this->arguments().size() < 2) {
    replMode();
    // qFatal("no entry point");
  } else {
    QString arg = this->arguments().at(1);
    interpreterMode(arg);
  }
  return QCoreApplication::exec();
}

void App::replMode() {
  QNodeEngine* qnodeEngine = qobject_cast<QNodeEngine*>(this->engine);
  REPL* repl = new REPL(qnodeEngine, this->out, this);

  QSocketNotifier* notifier =
      new QSocketNotifier(0, QSocketNotifier::Read, this);

  connect(notifier, &QSocketNotifier::activated, [this, repl]() {
    QTextStream qin(stdin);
    QString line = qin.readLine();
    repl->evaluate(line);
    // qDebug() << "inn: " << line;
  });

  // connect(repl, &REPL::)
}

void App::interpreterMode(QString file) {
  QString entry = Utils::resolvePath(QDir::currentPath(), file);
  QString path = Utils::dirname(entry);

  connect(engine, &NodeEngine::finished,
          [this](const QJSValue& e, const bool& failed) {
            int code = 0;
            QStringList stackLines = e.property("stack").toString().split("\n");

            if (failed) {
              code = 1;
              this->err->operator<<(e.property("name").toString() + ": " +
                                    e.property("message").toString() + "\n");

              for (int i = 0; i < stackLines.size(); i++)
                this->err->operator<<("  " + stackLines.at(i) + "\n");
            };

            this->out->flush();
            this->err->flush();

            this->exit(code);
          });

  connect(engine, &NodeEngine::ipcMessage, [this](const QJSValue& msg) {
    qDebug() << "ipcMsg: " << JSValueUtils::stringify(msg);
  });

  connect(engine, &NodeEngine::readyReadStandardOutput, [this]() {
    this->out->operator<<(this->engine->readAllStandardOutput());
    this->out->flush();
  });

  connect(engine, &NodeEngine::readyReadStandardError, [this]() {
    this->err->operator<<(this->engine->readAllStandardError());
    this->err->flush();
  });

  this->engine->start(entry, path);
}
