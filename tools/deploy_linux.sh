#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"

TARGET_APP=$1
TARGET_BIN=$PROJECT_PATH/dist/$TARGET_APP/$TARGET_APP

QT_PATH="$($PROJECT_PATH/tools/get_qt_path.sh)"
echo "QT: $QT_PATH"
DEPLOY_CMD="./build/tools/linuxdeployqt $TARGET_BIN -verbose=2 -qmldir=$PROJECT_PATH/src/libquark/qml"

./build/tools/qbs/bin/qbs install --install-root $PROJECT_PATH/dist -p $TARGET_APP

PATH="$QT_PATH:$PATH"
$DEPLOY_CMD
$DEPLOY_CMD
