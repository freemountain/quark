#!/bin/bash
set -e

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
PROFILE=$2

pushd . > /dev/null

"$PROJECT_PATH/qbs_wrapper" install --install-root "$PROJECT_PATH/dist/win" -p $TARGET_APP profile:$PROFILE
cd "$PROJECT_PATH/dist/win"
zip -r quark-win.zip QuarkGui
popd > /dev/null
