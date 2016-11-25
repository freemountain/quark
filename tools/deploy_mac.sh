#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1

macdeployqt $TARGET_APP -qmldir=$PROJECT_PATH/src/qml -no-strip
