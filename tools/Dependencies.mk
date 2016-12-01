NPM_PKGS:=$(addsuffix node_modules, $(wildcard $(PROJECT_PATH)/example/*/))
NPM_PKGS+=$(PROJECT_PATH)/tmp/node_path/node_modules
NPM_PKGS+=$(PROJECT_PATH)/src/node_path/node_modules

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
$(NPM_PKGS): $(TOOLS)
	cd $(dir $@) && $(NPM_CMD) install

##
#  shortcut
#
npm-install: $(NPM_PKGS)
