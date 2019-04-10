subdir_vendor = plugin_$${PLUGIN_NAME}_subdir-vendor
dist_qml = plugin_$${PLUGIN_NAME}_dist-qml

$${subdir_vendor}.subdir = $${PLUGIN_PWD}/fluid

$${dist_qml}.source = fluid/qml
#$${dist_qml}.patterns = "*.qml" "*.dylib"
$${dist_qml}.target = qml
$${dist_qml}.plugin_name = $$PLUGIN_NAME

PLUGIN_SUBDIRS += $${subdir_vendor}
PLUGIN_DIST += $${dist_qml}