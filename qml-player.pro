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

#copy node_path
macx: copy_node_path.commands = $(COPY_DIR) $$PWD/src/node_path $$OUT_PWD/$$TARGET".app"/Contents/Resources/
linux: copy_node_path.commands = $(COPY_DIR) $$PWD/src/node_path $$OUT_PWD/



#copy default app
macx: copy_app.commands = $(COPY_DIR) $$PWD/example/default $$OUT_PWD/$$TARGET".app"/Contents/Resources/
linux: copy_app.commands = $(COPY_DIR) $$PWD/example/default $$OUT_PWD/

first.depends = $(first) copy_node_path copy_app
export(first.depends)
export(copy_node_path.commands)
export(copy_app.commands)

QMAKE_EXTRA_TARGETS += first copy_node_path copy_app

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target
