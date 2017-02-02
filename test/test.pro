TEMPLATE = app

QT       += qml testlib
QT       -= gui

TARGET = test
CONFIG   += console warn_on depend_includepath testcase
CONFIG   -= app_bundle

OTHER_FILES += fixtures/*

SOURCES += \
    main.cpp

DEFINES += SRCDIR=\\\"$$PWD/\\\"

win32:CONFIG(release, debug|release): LIBS += -L$$OUT_PWD/../lib/release/ -lqnode
else:win32:CONFIG(debug, debug|release): LIBS += -L$$OUT_PWD/../lib/debug/ -lqnode
else:unix: LIBS += -L$$OUT_PWD/../lib/ -lqnode

INCLUDEPATH += $$PWD/../lib
DEPENDPATH += $$PWD/../lib

HEADERS += \
    jsvalueutilstest.h \
    jstests.h

DISTFILES += \
    fixtures/loader/someOtherDep.js \
    fixtures/loader/someIndex.js \
    fixtures/loader/someDep.js \
    fixtures/loader/node_modules/isarray/index.js \
    fixtures/loader/malformed.js \
    fixtures/loader/node_modules/isarray/package.json \
    fixtures/loader/simple.js
