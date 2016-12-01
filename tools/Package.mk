ifeq ($(OS), darwin)

package:
	cd $(BUILD_PATH) && macdeployqt quark.app -qmldir=$(PROJECT_PATH)/src/qml -no-strip
	$(PROJECT_PATH)/tools/fixTravis.sh $(BUILD_PATH)/quark.app $(dir $(QT))lib
	hdiutil create -volname QuarkInstaller -srcfolder $(BUILD_PATH)/quark.app -ov -format UDZO $(PROJECT_PATH)/build/quark-osx-x64.dmg	

endif
