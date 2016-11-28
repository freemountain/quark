#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."
TARGET_APP="$(realpath $1)"

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

NODE_CMD="$BIN_PATH/node"
NPM_CMD="$BIN_PATH/npm"
PRUNE_CMD="$NODE_CMD $NPM_CMD prune --production"

pushd . > /dev/null

cd "$TARGET_APP/Contents/Resources/node_path"
$PRUNE_CMD

cd "$TARGET_APP/Contents/Resources/default"
$PRUNE_CMD

popd > /dev/null

macdeployqt $TARGET_APP -qmldir=$PROJECT_PATH/src/qml -no-strip
