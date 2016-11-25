#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$(realpath $1)

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

pushd . >> /dev/null
cd "$TARGET_APP/Contents/Resources/node_path"
"$BIN_PATH/node" "$BIN_PATH/npm" prune --production
cd "$TARGET_APP/Contents/Resources/default"
"$BIN_PATH/node" "$BIN_PATH/npm" prune --production
popd >> /dev/null

macdeployqt $TARGET_APP -qmldir=$PROJECT_PATH/src/qml -no-strip
