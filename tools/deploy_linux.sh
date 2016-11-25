#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$(realpath $1)
TARGET_PATH=$(dirname "$TARGET_APP")

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

DEPLOY_CMD="$BIN_PATH/linuxdeployqt"


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

pushd . >> /dev/null
cd "$TARGET_PATH/node_path"
"$BIN_PATH/node" "$BIN_PATH/npm" prune --production
cd "$TARGET_PATH/default"
"$BIN_PATH/node.exe" "$BIN_PATH/npm" prune --production
popd >> /dev/null

PATH="$BIN_PATH:$PATH" "$DEPLOY_CMD" $TARGET_APP -qmldir=$PROJECT_PATH/src/qml -bundle-non-qt-libs -no-strip

# we need to run this two times...
PATH="$BIN_PATH:$PATH" "$DEPLOY_CMD" $TARGET_APP -appimage -qmldir=$PROJECT_PATH/src/qml -bundle-non-qt-libs -no-strip
