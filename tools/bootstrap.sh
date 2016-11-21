#!/bin/bash
set -e
PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

OS="$($PROJECT_PATH/tools/arch.sh -o)"
ARCH="$($PROJECT_PATH/tools/arch.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

mkdir -p "$BIN_PATH"

echo "download node..."
NODE_CMD=$("$PROJECT_PATH/tools/downloadNode.sh")
NPM_CMD="$BIN_PATH/npm"
echo "download qpm..."
QPM_CMD=$("$PROJECT_PATH/tools/downloadQpm.sh")
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"


pushd . > /dev/null

"$QPM_CMD" install

for i in $PROJECT_PATH/example/* ; do
  cd "$i"
  echo "npm install $i"
  "$NODE_CMD" "$NPM_CMD" install
done

cd "$PROJECT_PATH/src/node_path"
"$NODE_CMD" "$NPM_CMD" install

if [ "$OS" = "linux" ]; then

  if [ ! -d "$PROJECT_PATH/tmp/linuxdeployqt-src" ] ; then
      git clone "https://github.com/probonopd/linuxdeployqt" "$PROJECT_PATH/tmp/linuxdeployqt-src"
  fi

  if [ ! -d "$PROJECT_PATH/tmp/patchelf-src" ] ; then
      git clone "https://github.com/NixOS/patchelf" "$PROJECT_PATH/tmp/patchelf-src"
      cd "$PROJECT_PATH/tmp/patchelf-src/"
      ./bootstrap.sh
  fi

  if [ ! -d "$PROJECT_PATH/tmp/linuxdeployqt-build" ] ; then
      mkdir "$PROJECT_PATH/tmp/linuxdeployqt-build"
      cd "$PROJECT_PATH/tmp/linuxdeployqt-build"
      qmake "../linuxdeployqt-src"
      make
      cp "linuxdeployqt/linuxdeployqt" "$BIN_PATH/linuxdeployqt"
  fi

  if [ ! -d "$PROJECT_PATH/tmp/patchelf-build" ] ; then
      mkdir "$PROJECT_PATH/tmp/patchelf-build"
      cd "$PROJECT_PATH/tmp/patchelf-build"
      "$PROJECT_PATH/tmp/patchelf-src/configure" --prefix="$PROJECT_PATH/tmp/patchelf-build"
      make
      make install
      cp "$PROJECT_PATH/tmp/patchelf-build/bin/patchelf" "$BIN_PATH/patchelf"
  fi

  APPIMG_CMD="$BIN_PATH/appimagetool"
  if [ ! -f "$APPIMG_CMD" ] ; then
      curl -L -o "$APPIMG_CMD" "https://github.com/probonopd/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
      chmod +x "$APPIMG_CMD"
  fi
fi
popd > /dev/null
