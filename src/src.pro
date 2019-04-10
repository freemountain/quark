TEMPLATE = subdirs

SUBDIRS = lib shell plugins
CONFIG += qtc_runnable

shell.depends = lib
shell.depends += plugins