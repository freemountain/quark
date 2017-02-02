#ifndef UTILMODULE_H
#define UTILMODULE_H

#include <QObject>

#include "../../qnode.h"
#include "../engine/enginecontext.h"
#include "../modules/basemodule.h"
#include "../nodemodule.h"
class UtilModule : public BaseModule {
  Q_OBJECT
 public:
  explicit UtilModule(QNodeEngineContext* ctx);

  Q_INVOKABLE QString inspect(QJSValue object, int depth = 2);
};

#endif  // UTILMODULE_H
