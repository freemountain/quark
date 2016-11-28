#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
TARGET_PATH=$(dirname "$TARGET_APP")

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

DEPLOY_CMD="$BIN_PATH/linuxdeployqt"
NODE_CMD="$BIN_PATH/node"
NPM_CMD="$BIN_PATH/npm"
PRUNE_CMD="$NODE_CMD $NPM_CMD prune --production"

pushd . > /dev/null

cd "$TARGET_APP/node_path"
$PRUNE_CMD

cd "$TARGET_APP/default"
$PRUNE_CMD

popd > /dev/null

cat << EOF > "$TARGET_PATH/quark.desktop"
[Desktop Entry]
Type=Application
Name=Quark
Exec=AppRun %F
Icon=default
Comment=Edit this default file
Terminal=true
EOF

cp "$PROJECT_PATH/quark.svg" "$TARGET_PATH/default.svg"

PATH="$BIN_PATH:$PATH" "$DEPLOY_CMD" $TARGET_APP -qmldir=$PROJECT_PATH/src/qml -bundle-non-qt-libs -no-strip

# we need to run this two times...
PATH="$BIN_PATH:$PATH" "$DEPLOY_CMD" $TARGET_APP -appimage -qmldir=$PROJECT_PATH/src/qml -bundle-non-qt-libs -no-strip
