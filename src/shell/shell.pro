TARGET = quark

include(../lib/quark/quark.pri)
#include(../greeter/greeter.pri)
PLUGINS_SOURCE_ROOT = $$PWD/../plugins
PLUGINS_OUT_PWD_ROOT = $$OUT_PWD/../plugins

!include($$PLUGINS_SOURCE_ROOT/plugins.pri):

QT += qml
CONFIG += qtc_runnable

HEADERS += \
    $$files($$PWD/*.h)

SOURCES += \
    $$files($$PWD/*.cpp)

macx:QMAKE_CLEAN += -r *.app
GREETER_COPY_NAME = main
macx:{
    # suppress the default RPATH if you wish
    #QMAKE_LFLAGS_RPATH=
    # add your own with quoting gyrations to make sure $ORIGIN gets to the command line unexpanded
    QMAKE_LFLAGS += "-Wl,-rpath,@executable_path/../Frameworks"

    PLUGINS_DIST_ROOT = $${OUT_PWD}/$${TARGET}.app/Contents/PlugIns

    COPIES += quark_copy greeter_copy
}

QMAKE_EXTRA_COMPILERS += $$get_plugin_extra_compilers()




