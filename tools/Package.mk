##
# osx
#

ifeq ($(OS), darwin)
PACKAGE_TASK:= package-osx
endif

package-osx:
	$(QT)/macdeployqt quark.app -qmldir=$(PROJECT_PATH)/src/qml -no-strip
	$(PROJECT_PATH)/tools/fixTravis.sh $(BUILD_PATH)/quark.app $(dir $(QT))lib
	hdiutil create -volname QuarkInstaller -srcfolder $(BUILD_PATH)/quark.app -ov -format UDZO $(BUILD_PATH)/quark-osx-x64.dmg

	
##
# osx
#

ifeq ($(OS), linux)
PACKAGE_TASK:= package-linux
endif

$(BUILD_PATH)/quark.desktop:
	cp $(PROJECT_PATH)/tools/quark.desktop $@

$(BUILD_PATH)/default.svg:
	cp $(PROJECT_PATH)/quark.svg $@

LINUXDEPLOY_CMD:="PATH=\"$(BIN_PATH):$(PATH)\" $(BIN_PATH)/linuxdeployqt"

package-linux: $(BUILD_PATH)/default.svg $(BUILD_PATH)/quark.desktop
	$(LINUXDEPLOY_CMD) quark -qmldir=$(PROJECT_PATH)/src/qml -bundle-non-qt-libs -no-strip
	$(LINUXDEPLOY_CMD) quark -qmldir=$(PROJECT_PATH)/src/qml -bundle-non-qt-libs -no-strip -appimage


package: $(PACKAGE_TASK)
PHONY_TARGET+=package package-osx package-linux


##
#  for building random apps
#
#@if [ ! -f "$(APP)/package.json" ]; then \
#	echo "\n\tThe directory $(APP) does not seem to contain a valid quark app.\n\tPlease make sure to add a package.json.\n" && exit 1; \
#fi
#


