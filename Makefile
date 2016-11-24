#export PATH=$PATH:/path/to/Qt/5.7/clang_64/bin
#check for qpm

.PHONY: test, build, run, clean, example/%

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
JS_DIR:=$(WORKING_DIR)/src/node_path

##
#  find all relevant sources (sources that end with .js)
#  and get their path relative to working dir
#
SOURCES_RELATIVE:= \
	$(shell cd $(JS_DIR) && find src -type f -iname '*.js')

##
#  save the relative sources to a new variable that holds al SOURCES
#  with absolute paths
#
SOURCES:= \
	$(foreach x, $(SOURCES_RELATIVE), $(JS_DIR)/$(x))

##
#  these are our "object"-files - the files that are transpiled from
#  es6 to es5
#
OBJECTS:= \
	$(foreach x, $(SOURCES_RELATIVE), $(BUILD_DIR)/$(x))

##
#  these are our "object"-files - the files that are transpiled from
#  es6 to es5
#
INSTALLED_OBJECTS:= \
	$(foreach x, $(shell cd $(JS_DIR)/src && find . -type f -iname '*.js'), $(JS_DIR)/lib/$(x)) \

export PATH:=$(QT):$(PATH)

all: build

build: $(BUILD_DIR)/quark.app
	@echo "Build finished"

run: APP=$(WORKING_DIR)/example/default
run: build
	@echo "Running app"
	$(WORKING_DIR)/build/quark.app/Contents/MacOS/quark $(APP)/package.json

force:

example/%: force
	make run APP=$@

clean:
	rm -rf $(WORKING_DIR)/setupfile
	rm -rf $(WORKING_DIR)/src/node_path/node_modules
	cd $(BUILD_DIR) && make clean
	rm -rf $(BUILD_DIR)
	rm -rf $(JS_DIR)/lib
	rm -rf $(JS_DIR)/node_modules

test: $(OBJECTS) $(BUILD_DIR)/node_modules
	$(WORKING_DIR)/src/node_path/node_modules/.bin/istanbul cover --root $(BUILD_DIR)/src -x "**/__tests__/**" $(WORKING_DIR)/src/node_path/node_modules/.bin/_mocha $(shell find $(BUILD_DIR)/src -name "*Test.js" -not -path "*node_modules*") -- -R spec --require source-map-support/register


setup: $(WORKING_DIR)/setupfile

##
#  builds the qt renderer app
#
$(BUILD_DIR)/quark.app: $(INSTALLED_OBJECTS) test
	cd $(BUILD_DIR) && qmake ..
	cd $(BUILD_DIR) && make

##
#  adds the node modules to build dir
#  for testing purposes
#
#  TODO: hier müssen die files einzeln kopiert werden,
#  damit der änderungen checkt
#  
$(BUILD_DIR)/node_modules: $(WORKING_DIR)/setupfile
	cp -r $(JS_DIR)/node_modules $@

##
#  file to save setup status
#
$(WORKING_DIR)/setupfile:
	mkdir -p $(BUILD_DIR)
	cd $(WORKING_DIR)/src/node_path && npm install
	qpm install
	cd $(WORKING_DIR)/tools && make bootstrap
	@echo "setup done" > $@

##
#  this targets are necessary to not always trigger a rebuild of
#  transpiled files, even if they exist. if the no-op is removed
#  this will trigger a rebuild too
#
$(JS_DIR)/src/%.js:
	@echo "" > /dev/null

##
#  every transpiled file requires a matching source file
#  to be created.
#
$(BUILD_DIR)/src/%.js: $(JS_DIR)/src/%.js $(WORKING_DIR)/setupfile
	mkdir -p $(dir $@)
	$(JS_DIR)/node_modules/.bin/eslint $<
	$(JS_DIR)/node_modules/.bin/babel $< --out-file $@ --source-maps --presets es2017,es2016,node6 --plugins transform-runtime,transform-class-properties

##
#  every destination file needs a transpiled
#  source that is tested
#
$(JS_DIR)/lib/%.js: $(BUILD_DIR)/src/%.js
	mkdir -p $(dir $@)
	cp $< $@
