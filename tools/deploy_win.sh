#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$(realpath $1)
TARGET_PATH=$(dirname $TARGET_APP)

OS="$($PROJECT_PATH/tools/uname.sh -o)"
ARCH="$($PROJECT_PATH/tools/uname.sh -a)"
BIN_PATH="$PROJECT_PATH/tmp/bin-$OS-$ARCH"

QT_LIBS=$(dirname $(which qmake))
DEPLOY_QT_DLLS=( "Widgets" "Svg" "QuickTemplates2" "QuickControls2" "Quick" "Qml" "Network" "Gui" "Core" )
DEPLOY_QT_PLUGINS=( "bearer" "iconengines" "imageformats" "qmltooling"  )
DEPLOY_QML_MODULES=( "Qt" "QtQml" "QtQuick" "QtQuick.2" "QtGraphicalEffects" )
DEPLOY_COMPILER_RUNTIME=( "libgcc_s_dw2-1.dll" "libstdc++-6.dll" "libwinpthread-1.dll" )

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

#windeployqt $TARGET_APP  --compiler-runtime --no-libraries  --release --qmldir=$PROJECT_PATH/src/qml

#deploy dlls
for name in "${DEPLOY_QT_DLLS[@]}"
do
    echo "$QT_LIBS/Qt5$name.dll"
    cp -n "$QT_LIBS/Qt5$name.dll" "$TARGET_PATH/Qt5$name.dll"
done

#deploy platform plugins
mkdir -p "$TARGET_PATH/platforms"
cp -n "$QT_LIBS/../plugins/platforms/qwindows.dll" "$TARGET_PATH/platforms/qwindows.dll"

#deploy compiler runtim
for name in "${DEPLOY_COMPILER_RUNTIME[@]}"
do
    cp -n "$QT_LIBS/../../../Tools/mingw530_32/bin/$name" "$TARGET_PATH/$name"
done

#deploy plguins
pushd . > /dev/null
shopt -s globstar nullglob
for pl in "${DEPLOY_QT_PLUGINS[@]}"
do
    cd "$QT_LIBS/../plugins/$pl"
    for f in **/*d.dll; do
        name="$pl/${f/d.dll/.dll}"
        mkdir -p "$TARGET_PATH/$pl"
        cp -n "$QT_LIBS/../plugins/$name" "$TARGET_PATH/$name"
    done
done 

popd > /dev/null

#deploy qml stuff
pushd . > /dev/null
shopt -s globstar nullglob
for pl in "${DEPLOY_QML_MODULES[@]}"
do
    cd "$QT_LIBS/../qml/$pl"
    for f in **/*; do
        mkdir -p "$(dirname $TARGET_PATH/$pl/$f)"
        cp -n "$QT_LIBS/../qml/$pl/$f" "$TARGET_PATH/$pl/$f"
    done
done 

popd > /dev/null
