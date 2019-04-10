TEMPLATE = lib
CONFIG += plugin file_copies
QT += qml
COPIES += pluginfiles

DESTDIR = imports/TimeExample
TARGET  = qmlqtimeexampleplugin

SOURCES += plugin.cpp

pluginfiles.files += \
    imports/TimeExample/qmldir \
    imports/TimeExample/center.png \
    imports/TimeExample/clock.png \
    imports/TimeExample/Clock.qml \
    imports/TimeExample/hour.png \
    imports/TimeExample/minute.png



#target.path += $$[QT_INSTALL_EXAMPLES]/qml/qmlextensionplugins/imports/TimeExample
pluginfiles.path += $$OUT_PWD/imports/TimeExample

#INSTALLS += target qml pluginfiles

CONFIG += install_ok  # Do not cargo-cult this!
