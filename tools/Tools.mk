NODE_VERSION:=v7.1.0
QPM_VERSION:=v0.10.0
NPM_VERSION:=3.10.9

################################
######### Install Node #########
################################

NODE_CMD:=$(BIN_PATH)/node
ifeq ($(OS), windows)
NODE_CMD=$(BIN_PATH)/node.exe
endif

##
#  add paths
#
$(TMP_PATH) $(BIN_PATH):
	mkdir -p $@

##
#  add to destination on Unix
#
$(BIN_PATH)/node: $(TMP_PATH)
	curl https://nodejs.org/dist/$(NODE_VERSION)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH).tar.xz|tar -xJ -C $(TMP_PATH)
	cp $(TMP_PATH)/node-$(NODE_VERSION)-$(NODE_OS)-$(NODE_ARCH)/bin/node $(BIN_PATH)/node
	chmod +x $(BIN_PATH)/node

##
#  add to destination on Windows
#
$(BIN_PATH)/node.exe: $(TMP_PATH) $(BIN_PATH)
	if [ ! -f "$@" ]; then \
		curl -o "$@" "https://nodejs.org/dist/$(NODE_VERSION)/win-$(NODE_ARCH)/node.exe"; \
	fi

################################
################################


################################
######### Install qpm  #########
################################

QPM_CMD:=$(BIN_PATH)/qpm
ifeq ($(OS), windows)
QPM_CMD=$(BIN_PATH)/qpm.exe
endif

##
#  install qpm on unix
#
$(BIN_PATH)/qpm: $(BIN_PATH)
	curl -o $@ https://www.qpm.io/download/$(QPM_VERSION)/$(OS)_386/qpm
	chmod +x $@

##
#  install qpm on windows
#
$(BIN_PATH)/qpm.exe: $(BIN_PATH)
	if [ ! -f "$@" ]; then \
		curl -o "$@" "https://www.qpm.io/download/$(QPM_VERSION)/windows_386/qpm.exe"; \
	fi
################################
################################


################################
######### Install npm  #########
################################

NPM_CMD:= $(NODE_CMD) $(BIN_PATH)/npm
	
##
#  install npm on windows
#
$(BIN_PATH)/npm: $(BIN_PATH)
	curl -L -0 "https://github.com/npm/npm/archive/v$(NPM_VERSION).tar.gz"|tar xz -C $(BIN_PATH)
	echo "require('./npm-$(NPM_VERSION)/bin/npm-cli.js')" > $(BIN_PATH)/npm
	chmod +x $(BIN_PATH)/npm

################################
################################

##
#  Targets for tools on all platforms
#
BASE_TOOLS:=$(BIN_PATH) $(NODE_CMD) $(QPM_CMD) $(BIN_PATH)/npm
TOOLS:=$(BASE_TOOLS)

##
#  Targets for linux specific tools
#
LINUX_TOOLS:=$(BIN_PATH)/appimagetool $(BIN_PATH)/linuxdeployqt $(BIN_PATH)/patchelf

ifeq ($(OS), linux)
include $(PROJECT_PATH)/tools/LinuxTools.mk
TOOLS+=$(LINUX_TOOLS)
endif
