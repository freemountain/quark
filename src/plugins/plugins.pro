TEMPLATE = subdirs

PLUGINS_SOURCE_ROOT = $$PWD
include(plugins.pri)

SUBDIRS += $$PLUGIN_SUBDIRS