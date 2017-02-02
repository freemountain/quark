#!/bin/bash -e

BASE="/Users/dodo/Projekte/top/qNode/build"
BINARY="$BASE/cli/cli.app/Contents/MacOS/cli"
FRAMEW_FOLDER="$BASE/cli/cli.app/Contents/Frameworks/"

function DoInstallNameTool {
    xLIB="$1"
    xLIB_NAME="$2"
    xBINARY="$3"
    install_name_tool -change ${xLIB} "@executable_path/../Frameworks/${xLIB_NAME}" "${xBINARY}"
}

mkdir -p "$FRAMEW_FOLDER"

for LIB in $(otool -L "${BINARY}"|tail -n +2|grep dylib|cut -d '(' -f -1|awk '$1=$1'|sed '/^\// d')
do
    echo "Handling Lib: $LIB"
    LIB_NAME=$(basename "$LIB")
    LIB_PATH="$BASE/lib/${LIB_NAME}"
    echo "    Adding ${LIB_NAME}"
    cp -RLf "$LIB_PATH" "${FRAMEW_FOLDER}"

    DoInstallNameTool "$LIB" "$LIB_NAME" "$BINARY"
done
