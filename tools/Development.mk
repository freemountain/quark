##
#  used to always force a trigger of
#  an existing target
#
force:

$(BUILD_DIR)/quark.app/Contents/MacOS/quark:
	@if [ ! -f $@ ]; then \
    	echo "\\n\\n\\tPlease run 'make' before running the examples\\n\\n" && exit 1; \
	fi

##
#  runs the quark app at $(APP)
#
run: APP=$(PROJECT_PATH)/example/default
run: $(BUILD_DIR)/quark.app/Contents/MacOS/quark
	$< $(APP)/package.json

##
#  shortcut to start the examples
#
example/%: force
	make run APP=$(PROJECT_PATH)/$@
