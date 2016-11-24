
##
#  root directory (Makefile location)
#
TOOLS_PATH:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
PROJECT_PATH:=$(realpath $(TOOLS_PATH)/..)
TMP_PATH:=$(PROJECT_PATH)/tmp

OS:=$(shell $(TOOLS_PATH)/uname.sh -o)
ARCH:=$(shell $(TOOLS_PATH)/uname.sh -a)

BIN_PATH:=$(TMP_PATH)/bin-$(OS)-$(ARCH)

NODE_OS:=$(shell $(TOOLS_PATH)/uname.sh -o -f node)
NODE_ARCH:=$(shell $(TOOLS_PATH)/uname.sh -a -f node)

NODE_VERSION:=v7.1.0
QPM_VERSION:=v0.10.0
NPM_VERSION:=3.10.9

NPM_PKGS:=$(sort $(dir $(wildcard $(PROJECT_PATH)/example/*/)))
NPM_PKGS+=$(PROJECT_PATH)/src/node_path

#
# Node
#
NODE_CMD:=$(BIN_PATH)/node
ifeq ($(OS), windows)
NODE_CMD=$(BIN_PATH)/node.exe
endif

$(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH):
	curl https://nodejs.org/dist/$(NODE_VERSION)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz|tar -xJ -C $(TMP_PATH)

$(BIN_PATH)/node: $(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH)
	cp $(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(BIN_PATH)/node
	chmod +x $(BIN_PATH)/node

$(BIN_PATH)/node.exe:
	curl -o $@ https://nodejs.org/dist/$(NODE_VERSION)/win-$(NODE_ARCH)/node.exe

#
# qpm
#
QPM_CMD:=$(BIN_PATH)/qpm
ifeq ($(OS), windows)
QPM_CMD=$(BIN_PATH)/qpm.exe
endif

$(BIN_PATH)/qpm:
	curl -o $@ https://www.qpm.io/download/$(QPM_VERSION)/$(OS)_386/qpm
	chmod +x $@

$(BIN_PATH)/qpm.exe:
	curl -o $@ https://www.qpm.io/download/$(QPM_VERSION)/windows_386/qpm.exe
#
# NPM
#
NPM_CMD:= $(NODE_CMD) $(BIN_PATH)/npm

$(BIN_PATH)/npm-$(NPM_VERSION):
	curl -L -0 "https://github.com/npm/npm/archive/v$(NPM_VERSION).tar.gz"|tar xz -C $(BIN_PATH)

$(BIN_PATH)/npm: $(BIN_PATH)/npm-$(NPM_VERSION)
	echo "require('./npm-$(NPM_VERSION)/bin/npm-cli.js')" > $(BIN_PATH)/npm
	chmod +x $(BIN_PATH)/npm

	
#
# appimagetool
#
$(BIN_PATH)/appimagetool:
	curl -L -o $(BIN_PATH)/appimagetool "https://github.com/probonopd/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
	chmod +x $(BIN_PATH)/appimagetool

#
#linuxdeployqt
#
$(TMP_PATH)/linuxdeployqt-src:
	git clone https://github.com/probonopd/linuxdeployqt $@

$(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH): $(TMP_PATH)/linuxdeployqt-src
	mkdir -p $@
	cd $@ && qmake $(TMP_PATH)/linuxdeployqt-src && make

$(BIN_PATH)/linuxdeployqt: $(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH)
	cp $(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH)/linuxdeployqt/linuxdeployqt $@


#
#patchelf
#
$(TMP_PATH)/patchelf-src:
	git clone https://github.com/NixOS/patchelf $@
	cd $@ && ./bootstrap.sh

$(TMP_PATH)/patchelf-build-$(OS)-$(ARCH): $(TMP_PATH)/patchelf-src
	mkdir -p $@
	cd $@ && $(TMP_PATH)/patchelf-src/configure --prefix=$@
	cd $@ && make && make install

$(BIN_PATH)/patchelf: $(TMP_PATH)/patchelf-build-$(OS)-$(ARCH)
	cp $(TMP_PATH)/patchelf-build-$(OS)-$(ARCH)/bin/patchelf $@


$(BIN_PATH):
	mkdir -p $(BIN_PATH)

clean:
	rm -rf $(PROJECT_PATH)/example/*/node_modules
	rm -rf $(PROJECT_PATH)/src/node_path/node_modules
	rm -rf $(PROJECT_PATH)/vendor
	rm -rf $(PROJECT_PATH)/tmp
	
qpm-install:
	cd $(PROJECT_PATH) && $(QPM_CMD) install

npm-install:
	$(foreach pkg,$(NPM_PKGS),cd $(pkg);$(NPM_CMD) install)

BASE_TOOLS:=$(BIN_PATH) $(NODE_CMD) $(QPM_CMD) $(BIN_PATH)/npm
LINUX_TOOLS:=$(BIN_PATH)/appimagetool $(BIN_PATH)/linuxdeployqt $(BIN_PATH)/patchelf

TOOLS:=$(BASE_TOOLS)
ifeq ($(OS), linux)
TOOLS+=$(LINUX_TOOLS)
endif

tools: $(TOOLS)
bootstrap: tools qpm-install npm-install

test: $(TMP_PATH)/linuxdeployqt-build-$(OS)-$(ARCH)
.PHONY: tools npm-install qpm-install bootstrap clean
