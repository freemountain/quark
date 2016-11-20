#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

NODE_VERSION="v7.1.0"
ARCH="$($PROJECT_PATH/tools/arch.sh -f node -a)"
OS="$($PROJECT_PATH/tools/arch.sh -f node -o)"
BASE_URL="https://nodejs.org/dist/$NODE_VERSION"
BASE_PATH="$PROJECT_PATH/tmp/node-$NODE_VERSION-$OS-$ARCH"

pushd . > /dev/null
mkdir -p "$BASE_PATH"

if [ "$OS" == "$win" ]; then
  URL="$BASE_URL/win-$ARCH/node.exe"
  NODE_CMD="$BASE_PATH/node.exe"

  curl -o "$NODE_CMD" "$URL"
  echo $NODE_CMD
  exit
fi

URL="$BASE_URL/node-$NODE_VERSION-$OS-$ARCH.tar.xz"
NODE_CMD="$BASE_PATH/bin/node"

if [ -f "$NODE_CMD" ]; then
  echo "$NODE_CMD"
  exit
fi

cd "$BASE_PATH/.."
curl -0 "$URL"|tar -xJ
popd > /dev/null

echo "$NODE_CMD"
