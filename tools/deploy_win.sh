#!/bin/bash
set -e

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP=$1
PROFILE=$2

dashed_target="$($PROJECT_PATH/tools/to_dashed.sh $TARGET_APP)"

pushd . > /dev/null
rm -rf "$PROJECT_PATH/dist/win"

"$PROJECT_PATH/qbs_wrapper" install --install-root "$PROJECT_PATH/dist/win" -p $TARGET_APP profile:$PROFILE
cd "$PROJECT_PATH/dist/win"
zip -r "$dashed_target-win-x86.zip" $TARGET_APP
popd > /dev/null
