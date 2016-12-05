TEMPLATE = app
TARGET = quark

QT += qml quick quickcontrols2 widgets

CONFIG += c++11
include(vendor/vendor.pri)

SOURCES += src/cpp/main.cpp \
    src/cpp/rootstore.cpp \
    src/cpp/environment.cpp \
    src/cpp/quarkprocess.cpp \
    src/cpp/debugger.cpp

HEADERS += \
    src/cpp/rootstore.h \
    src/cpp/environment.h \
    src/cpp/quarkprocess.h \
    src/cpp/either.h \
    src/cpp/logger.h \
    src/cpp/debugger.h

RESOURCES += qml.qrc

OUT_PWD_WIN = $${OUT_PWD}
OUT_PWD_WIN ~= s,/,\\,g

ICON = quark.icns

win32:RC_ICONS += quark.ico
!win32: NODE_CMD = $$PWD/tmp/bin-$$system(bash tools/uname.sh -o)-$$system(bash tools/uname.sh -a)/node

macx {
	copy_node.commands = $(COPY_DIR) $$NODE_CMD $$OUT_PWD/$$TARGET".app"/Contents/MacOS/
	copy_node_path.commands = $(COPY_DIR) $$PWD/tmp/node_path $$OUT_PWD/$$TARGET".app"/Contents/Resources/
	copy_app.commands = $(COPY_DIR) $$PWD/example/default $$OUT_PWD/$$TARGET".app"/Contents/Resources/
}

linux {
	copy_node.commands = $(COPY_DIR) $$NODE_CMD $$OUT_PWD/
	copy_node_path.commands = $(COPY_DIR) $$PWD/tmp/node_path $$OUT_PWD/
	copy_app.commands = $(COPY_DIR) $$PWD/example/default $$OUT_PWD/
}

win32 {
        NODE_CMD = $$PWD/tmp/bin-windows-x86/node.exe
        OUT_PWD_WIN = $$OUT_PWD/release
	      CONFIG(debug, debug|release): OUT_PWD_WIN = $$OUT_PWD/debug

        copy_node.commands = $(COPY_FILE) $$shell_path($$NODE_CMD) $$OUT_PWD_WIN
        copy_node_path.commands = $(MKDIR) $$shell_path($$OUT_PWD_WIN/node_path) && $(COPY_FILE) $$shell_path($$PWD/tmp/bundles/quark.js) $$shell_path($$OUT_PWD_WIN/node_path/quark.js)
        copy_app.commands = $(COPY_DIR) $$shell_path($$PWD/example/default) $$shell_path($$OUT_PWD_WIN/default)
}

first.depends = $(first) copy_node_path copy_app copy_node
export(first.depends)
export(copy_node_path.commands)
export(copy_app.commands)
export(copy_node.commands)

QMAKE_EXTRA_TARGETS += first copy_node_path copy_app copy_node

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target
