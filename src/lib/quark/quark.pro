TARGET = quark
TEMPLATE = lib

QT += qml gui
HEADERS += \
    $$files($$PWD/*.h)


SOURCES += \
    $$files($$PWD/*.cpp)
QMAKE_LFLAGS_SONAME = -Wl,-install_name,@rpath/
