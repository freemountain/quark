#!/bin/bash
set -e

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
QT_PATH="$($PROJECT_PATH/tools/get_qt_path.sh)"

"$PROJECT_PATH/qbs_wrapper" install --install-root $PROJECT_PATH/dist -p $TARGET_APP
$QT_PATH/macdeployqt $PROJECT_PATH/dist/$TARGET_APP.app -qmldir=$PROJECT_PATH/src/libquark/qml
