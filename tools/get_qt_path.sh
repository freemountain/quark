#!/bin/bash

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
DEFAULT_PROFILE="$($PROJECT_PATH/qbs_wrapper config --list defaultProfile| cut -d \" -f2)"

PROFILE=$1
if [ -z "$PROFILE" ]
  then
    PROFILE=$DEFAULT_PROFILE
fi

QUERY="profiles.$PROFILE.Qt.core.binPath"
QT_PATH="$($PROJECT_PATH/qbs_wrapper config --list $QUERY| cut -d \" -f2)"

echo $QT_PATH
