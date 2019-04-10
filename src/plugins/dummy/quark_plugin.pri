subdir_vendor = plugin_$${PLUGIN_NAME}_subdir-vendor
dist_qml = plugin_$${PLUGIN_NAME}_dist-qml

$${subdir_vendor}.subdir = $${PLUGIN_PWD}

$${dist_qml}.source = qmlextensionplugins/imports
#$${dist_qml}.patterns = "*"
$${dist_qml}.target = qml
$${dist_qml}.plugin_name = $$PLUGIN_NAME

PLUGIN_SUBDIRS += $${subdir_vendor}
PLUGIN_DIST += $${dist_qml}