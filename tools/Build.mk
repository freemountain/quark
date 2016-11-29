##
#  default build (only osx)
#
BUILD_DIR:=$(PROJECT_PATH)/build
JS_SRC:=$(PROJECT_PATH)/src/node_path
JS_OBJECTS:= \
	$(foreach x, $(shell cd $(JS_SRC)/src && find . -type f -iname '*.js'), $(TMP_PATH)/node_path/lib/$(x)) \

################################
########## Build C++ ###########
################################

##
#  copy entrypoint to TMP_PATH
#
$(TMP_PATH)/node_path/quark.js:
	mkdir -p $(dir $@)
	cp  $(JS_SRC)/quark.js $@

##
#  copy package.json to TMP_PATH
#
$(TMP_PATH)/node_path/package.json:
	mkdir -p $(dir $@)
	cp  $(JS_SRC)/package.json $@

##
#  install node modules in tmp
#
$(TMP_PATH)/node_path/node_modules: $(TMP_PATH)/node_path/package.json $(TOOLS)
	cd $(TMP_PATH)/node_path; $(NPM_CMD) install

##
#  TODO: drop dependency js-build, by copying
#  the relevant resources here, instead of in
#  qmake. this should fix the problems with
#  parallel build too
#
#  builds the qt/c++ stuff
#
$(BUILD_DIR)/quark.app: $(TMP_PATH)/node_path/node_modules $(TMP_PATH)/node_path/quark.js js-build qpm-install
	mkdir -p $(BUILD_DIR)
	mkdir -p $@
	mkdir -p $@/Contents
	mkdir -p $@/Contents/Resources
	mkdir -p $@/Contents/MacOS
	cd $(BUILD_DIR) && qmake ..
	cd $(BUILD_DIR) && make

################################
################################


################################
########### Build JS ###########
################################

##
#  js: lint, transpile and move to destination
#
$(TMP_PATH)/node_path/lib/%.js: $(JS_SRC)/src/%.js $(TOOLS) $(NPM_PKGS)
	mkdir -p $(dir $@)
	$(NODE_CMD) $(JS_SRC)/node_modules/eslint/bin/eslint.js $<
	$(NODE_CMD) $(JS_SRC)/node_modules/babel-cli/bin/babel.js $< --out-file $@ --source-maps --presets es2017,es2016,node6 --plugins transform-runtime,transform-class-properties

##
#  unit test js
#
js-test: $(JS_OBJECTS)
	PATH=$(BIN_PATH):$$PATH  $(JS_SRC)/node_modules/.bin/istanbul cover --root $(TMP_PATH)/node_path -x "**/__tests__/**" $(PROJECT_PATH)/src/node_path/node_modules/.bin/_mocha $(shell find $(TMP_PATH)/node_path -name "*Test.js" -not -path "*node_modules*") -- -R spec --require source-map-support/register

js-build: js-test

################################
################################
