#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

VERSION="v0.10.0"
ARCH="$($PROJECT_PATH/tools/arch.sh -f qpm -a)"
OS="$($PROJECT_PATH/tools/arch.sh -f qpm -o)"
BASE_URL="https://www.qpm.io/download/$VERSION"
BASE_PATH="$PROJECT_PATH/tmp/qpm-$VERSION-$OS-$ARCH"
BIN_PATH="$PROJECT_PATH/tmp/bin-$($PROJECT_PATH/tools/arch.sh -o)-$($PROJECT_PATH/tools/arch.sh -a)"

pushd . > /dev/null
mkdir -p "$BASE_PATH"

CMD="$BIN_PATH/qpm"

case "$OS" in
  darwin) URL="$BASE_URL/darwin_386/qpm";;
  linux) URL="$BASE_URL/linux_386/qpm";;
  win) URL="$BASE_URL/windows_386/qpm.exe" CMD="$CMD.exe" ;;
  *)  echo "could not parse uname -m output: $OS" >&2 ; exit 1;
esac

if [ -f "$CMD" ]; then
  echo "$CMD"
  exit
fi

cd "$BIN_PATH"
curl -O "$URL"
chmod +x "$CMD"

popd > /dev/null

echo "$CMD"
