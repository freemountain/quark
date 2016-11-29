
##
#  root directory (Makefile location)
#
PROJECT_PATH:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
TOOLS_PATH:=$(PROJECT_PATH)/tools
TMP_PATH:=$(PROJECT_PATH)/tmp

OS:=$(shell $(TOOLS_PATH)/uname.sh -o)
ARCH:=$(shell $(TOOLS_PATH)/uname.sh -a)

NODE_OS:=$(shell $(TOOLS_PATH)/uname.sh -o -f node)
NODE_ARCH:=$(shell $(TOOLS_PATH)/uname.sh -a -f node)

ifeq ($(OS), windows)
	OS:=windows
	ARCH:=x86
	NODE_OS:=win
	NODE_ARCH:=x86
endif

ifeq ($(OS), darwin)
QT:=$(HOME)/Qt/5.7/clang_64/bin
export PATH:=$(QT):$(PATH)
endif

BIN_PATH:=$(TMP_PATH)/bin-$(OS)-$(ARCH)

NODE_VERSION:=v7.1.0
QPM_VERSION:=v0.10.0
NPM_VERSION:=3.10.9

NPM_PKGS:=$(addsuffix node_modules, $(wildcard $(PROJECT_PATH)/example/*/))
NPM_PKGS+=$(PROJECT_PATH)/src/node_path/node_modules

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

BASE_TOOLS:=$(BIN_PATH) $(NODE_CMD) $(QPM_CMD) $(BIN_PATH)/npm
LINUX_TOOLS:=$(BIN_PATH)/appimagetool $(BIN_PATH)/linuxdeployqt $(BIN_PATH)/patchelf

TOOLS:=$(BASE_TOOLS)
ifeq ($(OS), linux)
TOOLS+=$(LINUX_TOOLS)
endif

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

#
# js stuff
#
JS_SRC:=$(PROJECT_PATH)/src/node_path
JS_OBJECTS:= \
	$(foreach x, $(shell cd $(JS_SRC)/src && find . -type f -iname '*.js'), $(TMP_PATH)/node_path/lib/$(x)) \

$(TMP_PATH)/node_path/lib/%.js: $(JS_SRC)/src/%.js $(TOOLS) $(NPM_PKGS)
	mkdir -p $(dir $@)
	$(NODE_CMD) $(JS_SRC)/node_modules/eslint/bin/eslint.js $<
	$(NODE_CMD) $(JS_SRC)/node_modules/babel-cli/bin/babel.js $< --out-file $@ --source-maps --presets es2017,es2016,node6 --plugins transform-runtime,transform-class-properties

$(TMP_PATH)/node_path/quark.js:
	mkdir -p $(dir $@)
	cp  $(JS_SRC)/quark.js $@

$(TMP_PATH)/node_path/package.json:
	mkdir -p $(dir $@)
	cp  $(JS_SRC)/package.json $@

$(TMP_PATH)/node_path/node_modules: $(TMP_PATH)/node_path/package.json
	cd $(TMP_PATH)/node_path; $(NPM_CMD) install

js-transpile: $(JS_OBJECTS) $(TMP_PATH)/node_path/node_modules $(TMP_PATH)/node_path/quark.js

js-test: $(JS_OBJECTS)
	PATH=$(BIN_PATH):$$PATH  $(JS_SRC)/node_modules/.bin/istanbul cover --root $(TMP_PATH)/node_path -x "**/__tests__/**" $(PROJECT_PATH)/src/node_path/node_modules/.bin/_mocha $(shell find $(TMP_PATH)/node_path -name "*Test.js" -not -path "*node_modules*") -- -R spec --require source-map-support/register

#
# default build (only osx)
#
BUILD_DIR:=$(PROJECT_PATH)/build

$(BUILD_DIR)/quark.app: js-transpile js-test qpm-install
	mkdir -p $(BUILD_DIR)
	cd $(BUILD_DIR) && qmake ..
	cd $(BUILD_DIR) && make

run: APP=$(PROJECT_PATH)/example/default
run: $(BUILD_DIR)/quark.app
	$(BUILD_DIR)/quark.app/Contents/MacOS/quark $(APP)/package.json

force:

example/%: force
	make run APP=$(PROJECT_PATH)/$@


$(BIN_PATH):
	mkdir -p $(BIN_PATH)

clean:
	rm -rf $(PROJECT_PATH)/example/*/node_modules
	rm -rf $(PROJECT_PATH)/src/node_path/node_modules
	rm -rf $(PROJECT_PATH)/vendor
	rm -rf $(PROJECT_PATH)/tmp
	rm -rf $(PROJECT_PATH)/build

$(PROJECT_PATH)/vendor:
	cd $(PROJECT_PATH) && $(QPM_CMD) install

qpm-install: $(PROJECT_PATH)/vendor

$(NPM_PKGS):
	cd $(dir $@) && npm install

npm-install: $(NPM_PKGS)
tools: $(TOOLS)
bootstrap: tools qpm-install npm-install js-transpile
test: js-test

.PHONY: tools bootstrap clean test
