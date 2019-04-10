defineReplace(listDirectories) {
    full_path = $$system_path($$absolute_path($$1))
    dirs = $$system(find $$full_path -maxdepth 1 -type d)
    dirs -= $$full_path
    return($$dirs)
}

defineReplace(findFiles) {
    full_path = $$system_path($$absolute_path($$1))
    name_patterns = $$2

    command = find $$full_path -type f -name $$system_quote($$take_first(name_patterns))
    for(pattern, name_patterns): command += -o -name $$system_quote($$pattern)
    message(find: $$command)
    files = $$system($$command)
    files -= $$full_path
    return($$files)
 }

# debugVar( var_name, $$prop_list)
defineTest(debugVar) {
    var_name = $$1
    var_value = $$eval($${var_name})
    prop_names = $$2
    message($${var_name}: \"$$var_value\")
    for(prop, prop_names): {
        var_prop_name = $${var_name}.$${prop}
        message($${var_prop_name}: \"$$eval($$var_prop_name)\")
    }
    message(" ")
}

defineReplace(math) {
    a = $$1
    win32 {
        result = $$system("set /a $$a")
    } else:unix {
        result = $$system("echo $(($$a))")
    }
    return($$result)
}

defineTest(exportItems) {
    list_name = $$1
    attributes_list_name = $$2

    for(item, $${list_name}) {
        export($${item})
        for(attribute, $${attributes_list_name}): export($${item}.$${attribute})
    }
}

defineTest(hasAtLeastOneAttribute) {
    target = $$1
    atrributes = $$2

    for(attribute, atrributes) {
        message(Checking $$attribute)
        !isEmpty( $${target}.$${attribute} ): return(true);
    }
    return(false)
}
