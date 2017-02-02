QT       += core qml concurrent

TARGET = nativeCap
TEMPLATE = lib
CONFIG += plugin

SOURCES += nativecapprovider.cpp \
    nativecap.cpp

HEADERS += nativecapprovider.h \
    nativecap.h
DISTFILES += nativeCap.json

INCLUDEPATH += $$PWD/../lib
