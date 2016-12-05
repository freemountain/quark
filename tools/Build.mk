##
#  default build (only osx)
#
JS_BUILD:=$(TMP_PATH)/node_path
JS_OBJECTS:= \
	$(foreach x, $(shell cd $(JS_SRC)/src && find . -type f -iname '*.js'), $(JS_BUILD)/lib/$(x)) \

################################
########## Build C++ ###########
################################

#########################
################################

################################
########### Build CPP ##########
################################

cpp-build: $(TMP_PATH)/bundles/quark.js
	mkdir -p $(BUILD_PATH)/quark.app
	mkdir -p $(BUILD_PATH)/quark.app/Contents/Resources
	mkdir -p $(BUILD_PATH)/quark.app/Contents/MacOS
	cd $(BUILD_PATH) && $(MAKE) --makefile qmake.mk

################################
########### Build JS ###########
################################

##
#  js: lint, transpile and move to destination
#
$(JS_BUILD)/lib/%.js: $(JS_SRC)/src/%.js $(TOOLS) $(DEPENDENCIES) $(JS_BUILD)/quark.js
	mkdir -p $(dir $@)
	$(NODE_CMD) $(JS_BUILD)/node_modules/eslint/bin/eslint.js $<
	$(NODE_CMD) $(JS_BUILD)/node_modules/babel-cli/bin/babel.js $< --out-file $@ --source-maps --presets es2017,es2016,node6 --plugins transform-runtime,transform-class-properties

##
#  unit test js
#
js-test: $(JS_OBJECTS)
	PATH=$(BIN_PATH):$$PATH $(JS_BUILD)/node_modules/.bin/istanbul cover --root $(JS_BUILD) -x "**/__tests__/**" $(JS_BUILD)/node_modules/.bin/_mocha $(shell find $(JS_BUILD) -name "*Test.js" -not -path "*node_modules*") -- -R spec --require source-map-support/register

js-build: $(JS_OBJECTS)

##
# bundel quark js
#
$(TMP_PATH)/bundles/quark.js: $(DEPENDENCIES) $(JS_OBJECTS)
	mkdir -p $(dir $@)
	$(NODE_CMD) $(JS_BUILD)/node_modules/browserify/bin/cmd.js $(JS_BUILD)/quark.js --node -s quark > $@ 

bundle-js: $(TMP_PATH)/bundles/quark.js

################################
################################
