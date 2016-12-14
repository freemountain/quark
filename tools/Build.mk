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

cpp-build: js-build
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
	$(NODE_CMD) $(JS_BUILD)/node_modules/babel-cli/bin/babel.js $< --out-file $@ --source-maps --presets es2015 --plugins transform-runtime,transform-class-properties

##
#  unit test js
#
js-test: $(JS_OBJECTS)
	PATH=$(BIN_PATH):$(PATH) $(JS_BUILD)/node_modules/.bin/istanbul cover --root $(JS_BUILD)/lib -x "**/__tests__/**" $(JS_BUILD)/node_modules/.bin/_mocha $(shell find $(JS_BUILD)/lib -name "*Test.js") -- -R spec --require source-map-support/register
	PATH=$(BIN_PATH):$(PATH) $(JS_BUILD)/node_modules/.bin/remap-istanbul -i $(PROJECT_PATH)/coverage/coverage.json -o $(PROJECT_PATH)/coverage/lcov-report -t html
	

js-build: $(JS_OBJECTS)

################################
################################
