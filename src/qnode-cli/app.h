#ifndef APP_H
#define APP_H

#include <QCoreApplication>
#include <QObject>
#include "src/engine/nodeengine.h"

class App : public QCoreApplication {
  Q_OBJECT
 public:
  App(int& argc, char* argv[]);
  int exec();
  void interpreterMode(QString file);
  void replMode();

 private:
  NodeEngine* engine;
  QTextStream* out;
  QTextStream* err;
};

#endif  // APP_H
