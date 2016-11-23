
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
NODE_CMD=$(NODE_CMD).exe
endif

$(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH):
	curl https://nodejs.org/dist/$(NODE_VERSION)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz|tar -xJ -C $(TMP_PATH)

$(BIN_PATH)/node: $(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH)
	cp $(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(BIN_PATH)/node
	chmod +x $(BIN_PATH)/node


#
# qpm
#
QPM_CMD:=$(BIN_PATH)/qpm
ifeq ($(OS), windows)
QPM_CMD=$(QPM_CMD).exe
endif

$(BIN_PATH)/qpm:
	curl -o $(BIN_PATH)/qpm https://www.qpm.io/download/$(QPM_VERSION)/$(OS)_386/qpm
	cp $(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(BIN_PATH)/node
	chmod +x $(BIN_PATH)/qpm
#
# NPM
#
NPM_CMD:= $(NODE_CMD) $(BIN_PATH)/npm

$(BIN_PATH)/npm-$(NPM_VERSION):
	curl -L -0 "https://github.com/npm/npm/archive/v$(NPM_VERSION).tar.gz"|tar xz -C $(BIN_PATH)

$(BIN_PATH)/npm: $(BIN_PATH)/npm-$(NPM_VERSION)
	echo "require('./npm-$(NPM_VERSION)/bin/npm-cli.js')" > $(BIN_PATH)/npm
	chmod +x $(BIN_PATH)/npm

$(BIN_PATH):
	mkdir -p $(BIN_PATH)


qpm-install:
	cd $(PROJECT_PATH) && $(QPM_CMD) install

npm-install:
	$(foreach pkg,$(NPM_PKGS),cd $(pkg);$(NPM_CMD) install)

base-tools: $(BIN_PATH) $(NODE_CMD) $(QPM_CMD) $(BIN_PATH)/npm
	@echo $(NPM_PKGS)

bootstrap: base-tools qpm-install npm-install
	
.PHONY: base-tools npm-install qpm-install bootstrap
