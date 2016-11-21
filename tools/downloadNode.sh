#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

NODE_VERSION="v7.1.0"
ARCH="$($PROJECT_PATH/tools/arch.sh -f node -a)"
OS="$($PROJECT_PATH/tools/arch.sh -f node -o)"
BASE_URL="https://nodejs.org/dist/$NODE_VERSION"
BASE_PATH="$PROJECT_PATH/tmp/node-$NODE_VERSION-$OS-$ARCH"

BIN_PATH="$PROJECT_PATH/tmp/bin-$($PROJECT_PATH/tools/arch.sh -o)-$($PROJECT_PATH/tools/arch.sh -a)"

pushd . > /dev/null

if [ ! -d "$PROJECT_PATH/tmp/npm-3.10.9" ]; then
  cd "$PROJECT_PATH/tmp"
  curl -L -0 "https://github.com/npm/npm/archive/v3.10.9.tar.gz"|tar xvz
fi

if [ ! -f "$BIN_PATH/npm" ]; then
  cd "$BIN_PATH"
  ln -s "$PROJECT_PATH/tmp/npm-3.10.9/bin/npm-cli.js" npm
fi

if [ "$OS" == "win" ]; then
  URL="$BASE_URL/win-$ARCH/node.exe"
  NODE_CMD="$BIN_PATH/node.exe"

  curl -o "$NODE_CMD" "$URL"
  echo $NODE_CMD
  exit
fi


URL="$BASE_URL/node-$NODE_VERSION-$OS-$ARCH.tar.xz"
BASE_PATH="$PROJECT_PATH/tmp/node-$NODE_VERSION-$OS-$ARCH"
NODE_CMD="$BASE_PATH/bin/node"


if [ ! -d "$BASE_PATH" ]; then
  cd "$PROJECT_PATH/tmp"
  curl -0 "$URL"|tar -xJ
fi

if [ ! -f "$BIN_PATH/node" ]; then
  cp "$BASE_PATH/bin/node" "$BIN_PATH/node"
fi

popd > /dev/null

echo "$BIN_PATH/node"
