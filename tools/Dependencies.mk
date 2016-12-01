NPM_PKGS:=$(addsuffix node_modules, $(wildcard $(PROJECT_PATH)/example/*/))
NPM_PKGS+=$(PROJECT_PATH)/tmp/node_path/node_modules
NPM_PKGS+=$(PROJECT_PATH)/src/node_path/node_modules

##
#  install qpm deps
#
$(PROJECT_PATH)/vendor: tools
	cd $(PROJECT_PATH) && $(QPM_CMD) install

##
#  shortcut
#
qpm-install: $(PROJECT_PATH)/vendor tools

##
#  install all npm deps
#
$(NPM_PKGS): tools
	cd $(dir $@) && $(NPM_CMD) install

##
#  shortcut
#
npm-install: $(NPM_PKGS) tools

PHONY_TARGET+=npm-install qpm-install
