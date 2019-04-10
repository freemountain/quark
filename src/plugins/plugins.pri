include(../../qmake/functions.pri)

message(" ")
message(PLUGINS)
debugVar(PLUGINS_SOURCE_ROOT)

# DISABLED_PLUGINS = fluid
plugin_paths = $$listDirectories($$PLUGINS_SOURCE_ROOT)

for(PLUGIN_PWD, plugin_paths) {
    plugin_pri = $$PLUGIN_PWD/quark_plugin.pri
    PLUGIN_NAME = $$basename(PLUGIN_PWD)

    contains(DISABLED_PLUGINS, $$PLUGIN_NAME) {
        message(Skipping excluded plugin \"$$PLUGIN_NAME\")
        next()
    }
    message(Found plugin \"$$PLUGIN_NAME\")
    !include($$plugin_pri): message(Could not find include for plugin \"$$PLUGIN_NAME\")
}


dist_props = plugin_name source patterns target
feat_copy_props = files path base
extra_compiler_props = input output name commands CONFIG files

defineReplace(get_plugin_extra_compilers) {
    PLUGIN_EXTRA_COMPILERS =
    for(dist, PLUGIN_DIST) {
        compiler_name = $${dist}_copy
        plugin_name = $$eval($${dist}.plugin_name)
        dist_source = $$eval($${dist}.source)
        dist_target = $$eval($${dist}.target)
        dist_patterns = $$eval($${dist}.patterns)

        debugVar($${dist}, $$dist_props)

        source_path = $$clean_path($$PLUGINS_OUT_PWD_ROOT/$$plugin_name/$$dist_source)
        target_path = $$clean_path($$PLUGINS_DIST_ROOT/$$plugin_name/$$dist_target)

        input_files = $$source_path
        !isEmpty(dist_patterns): input_files = $$findFiles($$source_path, $$dist_patterns)


        $${compiler_name}.output =
        for(input, input_files) {
            relative_file = $$relative_path($$input, $$source_path)
            $${compiler_name}.output += $$absolute_path($$relative_file, $$target_path)
        }

        $${compiler_name}.input = $${compiler_name}.files
        $${compiler_name}.commands = $(QINSTALL) ${QMAKE_FILE_IN} ${QMAKE_FILE_OUT}
        $${compiler_name}.name = COPY ${QMAKE_FILE_IN}
        $${compiler_name}.CONFIG = no_link no_clean target_predeps
        $${compiler_name}.files = $$input_files

        debugVar($${compiler_name}, $$extra_compiler_props)
        PLUGIN_EXTRA_COMPILERS += $${compiler_name}
    }
    exportItems(PLUGIN_EXTRA_COMPILERS, extra_compiler_props)
    return($$PLUGIN_EXTRA_COMPILERS)
}