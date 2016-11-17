#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
NODE_CMD=$2
TARGET_PATH=$(dirname "$TARGET_APP")
QT_PATH="/home/dodo/Qt5.7.0aa/5.7/gcc_64"

linuxdeployqt $TARGET_APP  --compiler-runtime --qmldir=$PROJECT_PATH/src/qml -bundle-non-qt-libs

: <<'END'
mkdir -p "$TARGET_PATH/platforms"
cp "$QT_PATH/plugins/platforms/libqxcb.so" "$TARGET_PATH/platforms/libqxcb.so"


libs=( "libQt5DBus.so.5" )
#libs=( "libQt5DBus.so.5" "libQt5XcbQpa.so.5" "libicudata.so.56" "libicuuc.so.56"  "libicui18n.so.56" "libQt5Core.so.5" "libQt5Gui.so.5" "libQt5Qml.so.5" "libQt5Network.so.5" "libQt5Widgets.so.5" )
for lib in ${libs[*]}
do
    cp "$QT_PATH/lib/$lib" "$TARGET_PATH/$lib"
done


qmlPlugins=( "QtQuick" "QtQuick.2" "QtQml" )
for qml in ${qmlPlugins[*]}
do
    cp -r "$QT_PATH/qml/$qml" "$TARGET_PATH/$qml"
done
END
