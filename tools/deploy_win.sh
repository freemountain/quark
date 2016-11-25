#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
TARGET_PATH=$(dirname "$TARGET_APP")

windeployqt $TARGET_APP  --compiler-runtime --release --qmldir=$PROJECT_PATH/src/qml