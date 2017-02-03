#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"

TARGET_APP=$1
TARGET_PATH="$PROJECT_PATH/dist/$TARGET_APP"
TARGET_BIN="$TARGET_PATH/$TARGET_APP"

QT_PATH="$($PROJECT_PATH/tools/get_qt_path.sh)"
echo "QT: $QT_PATH"
DEPLOY_CMD="$PROJECT_PATH/build/tools/linuxdeployqt $TARGET_BIN -no-strip -verbose=2 -qmldir=$PROJECT_PATH/src/libquark/qml"

pushd . > /dev/null

"$PROJECT_PATH/qbs_wrapper" install --install-root $PROJECT_PATH/dist -p $TARGET_APP
echo "HELLOOO $TARGET_PATH"
cat << EOF > "$TARGET_PATH/quark.desktop"
[Desktop Entry]
Type=Application
Name=Quark
Exec=AppRun %F
Icon=quark
Comment=Edit this default file
Terminal=true
EOF

cp quark.svg dist/$TARGET_APP/quark.svg

PATH="$QT_PATH:$PATH"
cd "$PROJECT_PATH/dist"
$DEPLOY_CMD
$DEPLOY_CMD -appimage

popd > /dev/null
