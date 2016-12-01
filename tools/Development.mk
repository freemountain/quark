ERROR_MSG:="\\n\\n\\tPlease run 'make' before running the examples\\n\\n"

##
#  used to always force a trigger of
#  an existing target
#
force:


ifeq ($(OS), darwin)

$(BUILD_PATH)/quark.app/Contents/MacOS/quark:
	@if [ ! -f $@ ]; then \
    	echo $(ERROR_MSG) && exit 1; \
	fi

RUN_DEPS:=$(BUILD_PATH)/quark.app/Contents/MacOS/quark

endif

##
#  runs the quark app at $(APP)
#
run: APP=$(PROJECT_PATH)/example/default
run: $(RUN_DEPS)
	$< $(APP)/package.json

##
#  shortcut to start the examples
#
example/%: force
	make run APP=$(PROJECT_PATH)/$@
