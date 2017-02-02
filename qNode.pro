TEMPLATE = subdirs

SUBDIRS += \
    lib \
    cli \
    test \
    nativeCap \
    qnode-apk

cli.depends = lib
test.depends = lib

CONFIG += ordered

OTHER_FILES += js/*
