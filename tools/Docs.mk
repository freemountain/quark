docs: $(TOOLS) force
	@echo $(JS_SRC)
	$(JS_SRC)/node_modules/.bin/esdoc -c $(JS_SRC)/esdoc.json
