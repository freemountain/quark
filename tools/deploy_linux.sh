#!/bin/bash
set -e

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"

TARGET_APP=$1
PROFILE=$2

DIST_PATH="$PROJECT_PATH/dist/linux"
TARGET_PATH="$DIST_PATH/$TARGET_APP"
TARGET_BIN="$TARGET_PATH/$TARGET_APP"

QT_PATH="$($PROJECT_PATH/tools/get_qt_path.sh $PROFILE)"
echo "QT: $QT_PATH"
DEPLOY_CMD="$PROJECT_PATH/build/tools/linuxdeployqt $TARGET_BIN -no-strip -qmldir=$PROJECT_PATH/src/libquark/qml"

pushd . > /dev/null

"$PROJECT_PATH/qbs_wrapper" install --install-root $DIST_PATH -p $TARGET_APP profile:$PROFILE

cat << EOF > "$TARGET_PATH/quark.desktop"
[Desktop Entry]
Type=Application
Name=Quark
Exec=AppRun %F
Icon=quark
Comment=Edit this default file
Terminal=true
EOF

cp quark.svg "$TARGET_PATH/quark.svg"

PATH="$QT_PATH:$PATH"
cd "$DIST_PATH"
$DEPLOY_CMD
$DEPLOY_CMD -appimage

popd > /dev/null
