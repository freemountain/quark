subdir_resources = plugin_$${PLUGIN_NAME}_subdir-resources
dist_qml = plugin_$${PLUGIN_NAME}_dist-qml

$${subdir_resources}.subdir = $${PLUGIN_PWD}

$${dist_qml}.source =
$${dist_qml}.patterns = "*.rcc"
$${dist_qml}.target = rcc
$${dist_qml}.plugin_name = $$PLUGIN_NAME

PLUGIN_SUBDIRS += $${subdir_resources}
PLUGIN_DIST += $${dist_qml}