QT += qml quick concurrent

CONFIG += c++11

SOURCES += main.cpp \
    appcontroller.cpp

RESOURCES += qml.qrc

# Additional import path used to resolve QML modules in Qt Creator's code model
QML_IMPORT_PATH =

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target

win32:CONFIG(release, debug|release): LIBS += -L$$OUT_PWD/../lib/release/ -lqnode
else:win32:CONFIG(debug, debug|release): LIBS += -L$$OUT_PWD/../lib/debug/ -lqnode
else:unix: LIBS += -L$$OUT_PWD/../lib/ -lqnode

INCLUDEPATH += $$PWD/../lib
DEPENDPATH += $$PWD/../lib

HEADERS += \
    appcontroller.h

DISTFILES += \
    qtquickcontrols2.conf
