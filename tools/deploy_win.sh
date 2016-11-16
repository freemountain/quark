#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
NODE_CMD=$2
TARGET_PATH=$(dirname "$TARGET_APP")


windeployqt $TARGET_APP  --compiler-runtime --qmldir=$PROJECT_PATH/src/qml

rm -f $TARGET_PATH/node.exe
rm -rf $TARGET_PATH/app
rm -rf $TARGET_PATH/node_path

cp $NODE_CMD $TARGET_PATH/node.exe
cp -r $PROJECT_PATH/apps/default $TARGET_PATH/app
cp -r $PROJECT_PATH/src/node_path $TARGET_PATH/node_path
