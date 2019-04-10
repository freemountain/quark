QUARK_OUT_PWD = $${OUT_PWD}/../lib/quark

INCLUDEPATH += $${PWD}
LIBS += -L$${OUT_PWD}/../lib/quark -lquark

DEPENDPATH+=$$PWD/

CONFIG += file_copies

quark_copy.files = $$files($${QUARK_OUT_PWD}/*.dylib)
quark_copy.path = $$OUT_PWD/quark.app/Contents/Frameworks
