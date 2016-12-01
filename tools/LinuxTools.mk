################################
##### Install appimagetool #####
################################

##
#  add tool for creating appimages
#
$(BIN_PATH)/appimagetool:
	curl -L -o $(BIN_PATH)/appimagetool "https://github.com/probonopd/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
	chmod +x $(BIN_PATH)/appimagetool


################################
#### Install linuxdeployqt #####
################################

##
# clone
#
$(TMP_PATH)/linuxdeployqt-src:
	git clone https://github.com/probonopd/linuxdeployqt $@

##
#  build
#
$(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH): $(TMP_PATH)/linuxdeployqt-src
	mkdir -p $@
	cd $@ && $(QT)/qmake $(TMP_PATH)/linuxdeployqt-src && make

##
#  move to destination
#
$(BIN_PATH)/linuxdeployqt: $(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH)
	cp $(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH)/linuxdeployqt/linuxdeployqt $@


################################
################################


################################
####### Install Patchelf #######
################################

##
#  clone and bootstrap
#
$(TMP_PATH)/patchelf-src:
	git clone https://github.com/NixOS/patchelf $@
	cd $@ && ./bootstrap.sh

##
#  build
#
$(TMP_PATH)/patchelf-build-$(OS)-$(ARCH): $(TMP_PATH)/patchelf-src
	mkdir -p $@
	cd $@ && $(TMP_PATH)/patchelf-src/configure --prefix=$@
	cd $@ && make && make install

$(BIN_PATH)/patchelf: $(TMP_PATH)/patchelf-build-$(OS)-$(ARCH)
	cp $</bin/patchelf $@
##
#  move to destination
#
$(BIN_PATH)/patchelf: $(TMP_PATH)/patchelf-build-$(OS)-$(ARCH)
#	cp $(TMP_PATH)/patchelf-build-$(OS)-$(ARCH)/bin/patchelf $@

################################
################################
