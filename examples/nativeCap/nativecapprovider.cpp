#include "nativecapprovider.h"
#include <QDebug>
#include "nativecap.h"

QNodeModule* NativeCapProvider::module(QNodeEngineContext* ctx,
                                       QString module) {
  return new NativeCap(ctx);
}

#if QT_VERSION < 0x050000
Q_EXPORT_PLUGIN2(nativeCap, NativeCapProvider)
#endif  // QT_VERSION < 0x050000
