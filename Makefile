#export PATH=$PATH:/path/to/Qt/5.7/clang_64/bin
#check for qpm

.PHONY: test, build, run, clean

##
#  use bash as shell
#
SHELL:=/bin/bash

##
#  root directory (Makefile location)
#
WORKING_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

##
#  path to qt bins
#
QT:=$(HOME)/Qt/5.7/clang_64/bin

BUILD_DIR:=$(WORKING_DIR)/build

export PATH:=$(QT):$(PATH)

all: build

build: $(BUILD_DIR)/quark.app
	@echo "Build finished"

run: APP=$(WORKING_DIR)/example/default
run: build
	@echo "Running app"
	$(WORKING_DIR)/build/quark.app/Contents/MacOS/quark $(APP)/package.json

clean:
	rm -rf $(WORKING_DIR)/setupfile
	rm -rf $(WORKING_DIR)/src/node_path/node_modules
	cd $(BUILD_DIR) && make clean

test: setup 
	$(WORKING_DIR)/src/node_path/node_modules/.bin/istanbul cover --root $(WORKING_DIR)/src/node_path -x "**/__tests__/**" $(WORKING_DIR)/src/node_path/node_modules/.bin/_mocha $(shell find $(WORKING_DIR)/src/node_path -name "*Test.js" -not -path "*node_modules*") -- -R spec --require source-map-support/register


setup: $(WORKING_DIR)/setupfile

##
#  builds the qt renderer app
#
$(BUILD_DIR)/quark.app: test
	cd $(BUILD_DIR) && qmake ..
	cd $(BUILD_DIR) && make

##
#  file to save setup status
#
$(WORKING_DIR)/setupfile:
	mkdir -p $(BUILD_DIR)
	cd $(WORKING_DIR)/src/node_path && npm install
	qpm install
	cd $(WORKING_DIR)/tools && make bootstrap
	@echo "setup done" > $(WORKING_DIR)/setupfile	
