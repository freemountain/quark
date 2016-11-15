TEMPLATE = app
TARGET = quark

QT += qml quick quickcontrols2 widgets

CONFIG += c++11
include(vendor/vendor.pri)

SOURCES += src/cpp/main.cpp \
    src/cpp/rootstore.cpp \
    src/cpp/environment.cpp \
    src/cpp/quarkprocess.cpp

HEADERS += \
    src/cpp/rootstore.h \
    src/cpp/environment.h \
    src/cpp/quarkprocess.h \
    src/cpp/either.h

RESOURCES += qml.qrc

#copy stuff
macx: copydata.commands = $(COPY_DIR) $$PWD/src/node_path $$OUT_PWD/$$TARGET".app"/Contents/Resources/
first.depends = $(first) copydata
export(first.depends)
export(copydata.commands)
QMAKE_EXTRA_TARGETS += first copydata

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target
