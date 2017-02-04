#!/bin/bash -e

PROJECT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../"
TARGET_APP_NAME=$1
QT_LIB_PATH=$2

TARGET_APP_PATH="$PROJECT_PATH/dist/mac/$TARGET_APP_NAME.app"

pushd . > /dev/null

cd "$PROJECT_PATH/dist/mac/$TARGET_APP_NAME.app/Contents"

QT_FRAMEWORKS=$(ls Frameworks|grep -e 'Qt\w*\.framework')
QT_PLUGINS=$(find PlugIns -name '*.dylib')

for lib in $QT_FRAMEWORKS
do
	echo "found $lib"
  name="${lib%.*}"
  install_name_tool -id @executable_path/../Frameworks/$lib/Versions/5/$name \
    $TARGET_APP_PATH/Contents/Frameworks/$lib/Versions/5/$name
done

for lib in $QT_FRAMEWORKS
do
	echo $lib
  name="${lib%.*}"
  install_name_tool -change $QT_LIB_PATH/$lib/Versions/5/$name \
        @executable_path/../Frameworks/$lib/Versions/5/$name \
        $TARGET_APP_PATH/Contents/MacOS/$TARGET_APP_NAME
done

for lib in $QT_FRAMEWORKS
do
	echo $lib
  name="${lib%.*}"
  for dep in $QT_FRAMEWORKS
  do
    dep_name="${dep%.*}"
    install_name_tool -change $QT_LIB_PATH/$dep/Versions/5/$dep_name \
          @executable_path/../Frameworks/$dep/Versions/5/$dep_name \
          $TARGET_APP_PATH/Contents/Frameworks/$lib/Versions/5/$name
  done
done

for plugin in $QT_PLUGINS
do
  for lib in $QT_FRAMEWORKS
  do
    name="${lib%.*}"
    install_name_tool -change $QT_LIB_PATH/$lib/Versions/5/$name \
          @executable_path/../Frameworks/$lib/Versions/5/$name \
          $TARGET_APP_PATH/Contents/$plugin
  done
done

popd > /dev/null
