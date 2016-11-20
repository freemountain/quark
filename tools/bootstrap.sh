#!/bin/bash
set -e
PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

NODE_CMD=$("$PROJECT_PATH/tools/downloadNode.sh")
NPM_CMD="$(dirname "$NODE_CMD")/npm"
QPM_CMD=$("$PROJECT_PATH/tools/downloadQpm.sh")

pushd . > /dev/null

"$QPM_CMD" install

for i in $PROJECT_PATH/example/* ; do
  cd "$i"
  "$NPM_CMD" install
done

cd "$PROJECT_PATH/src/node_path"
"$NPM_CMD" install

popd > /dev/null
