#!/bin/bash
set -e
set -o xtrace

build_qbs=true
if qbs_loc="$(type -p "qbs")" || [ -z "$qbs_loc" ]; then
  version="$(qbs --version)"
  echo "found qbs version: $version"
  a=( ${version//./ } )
  major=${a[0]}
  minor=${a[1]}
  echo "qbs major: $major and minor: $minor"
  if [ "$major" -ge "1" ] && [ "$minor" -ge "6" ]; then
    build_qbs=false
  fi
fi
echo "build qbs: $build_qbs"
