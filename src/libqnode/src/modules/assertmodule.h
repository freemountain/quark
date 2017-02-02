#ifndef ASSERTMODULE_H
#define ASSERTMODULE_H

#include <QObject>

class AssertModule : public QObject {
  Q_OBJECT
 public:
  explicit AssertModule(QObject* parent = 0);

 signals:

 public slots:
};

#endif  // ASSERTMODULE_H