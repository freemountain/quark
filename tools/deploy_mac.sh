#!/bin/bash
set -e

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"

TARGET_APP=$1
PROFILE=$2

QT_PATH="$($PROJECT_PATH/tools/get_qt_path.sh $PROFILE)"
dashed_target="$($PROJECT_PATH/tools/to_dashed.sh $TARGET_APP)"

rm -rf "$PROJECT_PATH/dist/mac"

"$PROJECT_PATH/qbs_wrapper" install --install-root $PROJECT_PATH/dist/mac -p $TARGET_APP
$QT_PATH/macdeployqt $PROJECT_PATH/dist/mac/$TARGET_APP.app -no-strip -qmldir=$PROJECT_PATH/src/libquark/qml

"$PROJECT_PATH/tools/fix_libs_mac.sh" $TARGET_APP "QT_PATH/../lib"

cd "$PROJECT_PATH/dist/mac"
echo "create $dashed_target-mac-x86_64.zip"
zip -rq "$dashed_target-mac-x86_64.zip" $TARGET_APP.app
