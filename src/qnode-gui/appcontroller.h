#ifndef APPCONTROLLER_H
#define APPCONTROLLER_H

#include <QObject>
#include "qnode.h"
#include "src/engine/nodeengine.h"

class AppController : public QObject {
  Q_OBJECT
 public:
  explicit AppController(QObject* parent = 0);

 signals:
  void stdErr(QVariant err);

  void stdOut(QVariant out);
  void result(QVariant src, QVariant result);

 public slots:
  void handleSubmitTextField(const int id, const QString& in);

 private:
  NodeEngine* engine;
};

#endif  // APPCONTROLLER_H
