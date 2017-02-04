#!/bin/bash -e

name=$1

dashed="$(echo $name | sed 's/\([A-Z]\)/-\1/g' | sed 's/^_\([a-z]\)/\1/g')"
clean_dashed=${dashed#?}
lowerd="$(echo "$clean_dashed" | tr '[:upper:]' '[:lower:]')"

echo $lowerd
