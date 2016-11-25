#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$(realpath $1)
TARGET_PATH=$(dirname "$TARGET_APP")

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

pushd . >> /dev/null
cd "$TARGET_PATH/node_path"
"$BIN_PATH/node.exe" "$BIN_PATH/npm" prune --production
cd "$TARGET_PATH/default"
"$BIN_PATH/node.exe" "$BIN_PATH/npm" prune --production
popd >> /dev/null

windeployqt $TARGET_APP  --compiler-runtime --release --qmldir=$PROJECT_PATH/src/qml
