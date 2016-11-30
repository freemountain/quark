package: APP=$(PROJECT_PATH)/build
package: APP_NAME=quark.app

ifeq ($(OS), darwin)

package:
	cd $(APP) && macdeployqt $(APP_NAME) -qmldir=$(PROJECT_PATH)/src/qml -no-strip
	$(PROJECT_PATH)/tools/fixTravis.sh $(APP)/$(APP_NAME) $(dir $(QT))lib
	hdiutil create -volname QuarkInstaller -srcfolder $(APP)/$(APP_NAME) -ov -format UDZO $(PROJECT_PATH)/build/quark-osx-x64.dmg
	
endif

##
#  for building random apps
#
#@if [ ! -f "$(APP)/package.json" ]; then \
#	echo "\n\tThe directory $(APP) does not seem to contain a valid quark app.\n\tPlease make sure to add a package.json.\n" && exit 1; \
#fi
#


