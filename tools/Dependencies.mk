#The old wildcard approach, didnt work on windows
NODE_MODULES:=$(addprefix $(PROJECT_PATH)/example/, $(addsuffix /node_modules,  $(shell ls $(PROJECT_PATH)/example)))
NODE_MODULES+=$(PROJECT_PATH)/src/node_path/node_modules
NODE_MODULES+=$(TMP_PATH)/node_path/node_modules

##
#  install qpm deps
#
$(PROJECT_PATH)/vendor: $(TOOLS) $(PROJECT_PATH)/qpm.json
	cd $(PROJECT_PATH) && $(QPM_CMD) install

##
#  shortcut
#
qpm-install: $(PROJECT_PATH)/vendor

##
#  install npm pkgs
#
$(PROJECT_PATH)/src/node_path/node_modules: $(TOOLS) $(PROJECT_PATH)/src/node_path/package.json
	cd $(dir $@) && $(NPM_CMD) install

$(TMP_PATH)/node_path/node_modules: $(TOOLS) $(TMP_PATH)/node_path/package.json
	cd $(dir $@) && $(NPM_CMD) install

$(PROJECT_PATH)/example/%/node_modules: $(TOOLS) $(PROJECT_PATH)/example/%/package.json
	cd $(dir $@) && $(NPM_CMD) install

##
#  copy entrypoint to TMP_PATH
#
$(TMP_PATH)/node_path/quark.js: $(JS_SRC)/quark.js
	mkdir -p $(dir $@)
	cp $< $@

##
#  copy package.json to TMP_PATH
#
$(TMP_PATH)/node_path/package.json: $(JS_SRC)/package.json
	mkdir -p $(dir $@)
	cp $< $@

##
#  shortcut
#
npm-install: $(NODE_MODULES)

DEPENDENCIES:=npm-install qpm-install

ifeq ($(OS), windows)

$(JS_SRC)/%:
	@echo "windows fix file: $@"

dep-install-windows: $(TOOLS) $(TMP_PATH)/node_path/package.json
	cd $(PROJECT_PATH) && $(QPM_CMD) install
	for pkg in $(NODE_MODULES) ; do \
		path=`dirname $$pkg`; \
		cd $$path; \
		$(NPM_CMD) install; \
	done

DEPENDENCIES:=dep-install-windows

endif