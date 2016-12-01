PKGS_DEFAULT:=$(addsuffix node_modules, $(wildcard $(PROJECT_PATH)/example/*/))
PKGS_DEFAULT+=$(PROJECT_PATH)/src/node_path/node_modules

NPM_PKGS:=$(PKGS_DEFAULT) $(TMP_PATH)/node_path/node_modules

##
#  install qpm deps
#
$(PROJECT_PATH)/vendor: $(TOOLS)
	cd $(PROJECT_PATH) && $(QPM_CMD) install

##
#  shortcut
#
qpm-install: $(PROJECT_PATH)/vendor

##
#  install all npm deps
#
$(PKGS_DEFAULT): $(TOOLS)
	cd $(dir $@) && $(NPM_CMD) install

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
$(PROJECT_PATH)/tmp/node_path/node_modules: $(TMP_PATH)/node_path/package.json $(TOOLS)
	cd $(dir $@); $(NPM_CMD) install

##
#  shortcut
#
npm-install: $(NPM_PKGS)
