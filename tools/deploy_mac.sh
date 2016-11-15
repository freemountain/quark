#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
NODE_CMD=$2


macdeployqt $TARGET_APP -qmldir=$PROJECT_PATH/src/qml

rm -f $TARGET_APP/Contents/MacOS/node
rm -rf $TARGET_APP/Contents/Resources/app

cp $NODE_CMD $TARGET_APP/Contents/MacOS/node
cp -r $PROJECT_PATH/apps/default $TARGET_APP/Contents/Resources/app
