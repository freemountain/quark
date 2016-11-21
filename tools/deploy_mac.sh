#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
NODE_CMD=$2


macdeployqt $TARGET_APP -qmldir=$PROJECT_PATH/src/qml
