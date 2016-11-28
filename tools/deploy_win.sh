#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$(realpath $1)
TARGET_PATH= $(dirname "$TARGET_APP")

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

DEPLOY_CMD="$BIN_PATH/linuxdeployqt"
NODE_CMD="$BIN_PATH/node.exe"
NPM_CMD="$BIN_PATH/npm"
PRUNE_CMD="$NODE_CMD $NPM_CMD prune --production"

pushd . > /dev/null

cd "$TARGET_PATH/node_path"
$PRUNE_CMD

cd "$TARGET_PATH/default"
$PRUNE_CMD

popd > /dev/null

windeployqt $TARGET_APP  --compiler-runtime --release --qmldir=$PROJECT_PATH/src/qml