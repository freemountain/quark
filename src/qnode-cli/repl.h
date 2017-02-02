#ifndef REPL_H
#define REPL_H

#include <QObject>
#include "qnode.h"

class REPL : public QObject {
  Q_OBJECT
 public:
  explicit REPL(QNodeEngine* engine, QTextStream* out, QObject* parent = 0);
  QJSValue evaluate(QString input);
 signals:

 public slots:
  void _write(QString data);
  void _readEngineOut();
  void _readEngineError();

 private:
  QNodeEngine* engine;
  QTextStream* out;
};

#endif  // REPL_H
