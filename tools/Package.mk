ifeq ($(OS), darwin)

package:
	cd $(BUILD_PATH) && macdeployqt quark.app -qmldir=$(PROJECT_PATH)/src/qml -no-strip
	$(PROJECT_PATH)/tools/fixTravis.sh $(BUILD_PATH)/quark.app $(QT)/lib
	hdiutil create -volname QuarkInstaller -srcfolder $(BUILD_PATH)/quark.app -ov -format UDZO $(PROJECT_PATH)/build/quark-osx-x64.dmg

endif

ifeq ($(OS), linux)
$(BUILD_PATH)/quark.desktop:
	ls $(PROJECT_PATH)/tools
	cp $(PROJECT_PATH)/tools/quark.desktop $@

$(BUILD_PATH)/default.svg:
	cp $(PROJECT_PATH)/quark.svg $@

LINUXDEPLOY_CMD:=$(BIN_PATH)/linuxdeployqt

package: $(BUILD_PATH)/default.svg $(BUILD_PATH)/quark.desktop
	cd $(BUILD_PATH) && PATH=$(BIN_PATH):$(QT)/bin:$(PATH) $(LINUXDEPLOY_CMD) $(BUILD_PATH)/quark -qmldir=$(PROJECT_PATH)/src/qml -bundle-non-qt-libs -no-strip
	cd $(BUILD_PATH) && PATH=$(BIN_PATH):$(QT)/bin:$(PATH) $(LINUXDEPLOY_CMD) $(BUILD_PATH)/quark -qmldir=$(PROJECT_PATH)/src/qml -bundle-non-qt-libs -no-strip -appimage

endif

ifeq ($(OS), windows)

package:
	$(PROJECT_PATH)/tools/deploy_win.sh $(BUILD_PATH)/release/quark.exe $(QT)/bin

endif

