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

all: build

build: $(WORKING_DIR)/build/quark.app
	@echo "Build finished"

run: APP=$(WORKING_DIR)/example/default
run: build
	@echo "Running app"
	$(WORKING_DIR)/build/quark.app/Contents/MacOS/quark $(APP)/package.json

clean:
	rm -rf $(WORKING_DIR)/build
	rm -rf $(WORKING_DIR)/setupfile
	rm -rf $(WORKING_DIR)/src/node_path/node_modules

test:
	$(WORKING_DIR)/src/node_path/node_modules/.bin/istanbul cover --root $(WORKING_DIR)/src/node_path -x "**/__tests__/**" $(WORKING_DIR)/src/node_path/node_modules/.bin/_mocha $(shell find $(WORKING_DIR)/src/node_path -name "*Test.js") -- -R spec --require source-map-support/register

##
#  builds the qt renderer app
#
$(WORKING_DIR)/build/quark.app: test $(WORKING_DIR)/build $(WORKING_DIR)/setupfile
	cd $(WORKING_DIR)/build && qmake ..
	cd $(WORKING_DIR)/build && make

##
#  file to save setup status
#
$(WORKING_DIR)/setupfile:
	cd $(WORKING_DIR)/src/node_path && npm install
	qpm install
	@echo "setup done" > $(WORKING_DIR)/setupfile

##
#  target to create build dir
#  
$(WORKING_DIR)/build:
	mkdir -p $(WORKING_DIR)/build
