#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

VERSION="v0.10.0"
ARCH="$($PROJECT_PATH/tools/arch.sh -f qpm -a)"
OS="$($PROJECT_PATH/tools/arch.sh -f qpm -o)"
BASE_URL="https://www.qpm.io/download/$VERSION"
BASE_PATH="$PROJECT_PATH/tmp/qpm-$VERSION-$OS-$ARCH"

pushd . > /dev/null
mkdir -p "$BASE_PATH"

URL="$BASE_URL/$OS""_$ARCH/qpm"
CMD="$BASE_PATH/qpm"

if [ -f "$CMD" ]; then
  echo "$CMD"
  exit
fi

cd "$BASE_PATH"
curl -O "$URL"
chmod +x "$CMD"

popd > /dev/null

echo "$CMD"
