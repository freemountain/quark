TEMPLATE = lib

RESOURCES = resources.qrc

# Compiler for pdfs
rcc_builder.name = qrc2rcc
rcc_builder.input = RESOURCES
rcc_builder.output = ${QMAKE_FILE_BASE}.rcc
rcc_builder.commands = rcc -binary ${QMAKE_FILE_IN} -o ${QMAKE_FILE_BASE}.rcc

# This makes the custom compiler run before anything else
rcc_builder.CONFIG += target_predeps

rcc_builder.variable_out = RCC
rcc_builder.clean = ${QMAKE_FILE_BASE}.rcc
QMAKE_EXTRA_COMPILERS += rcc_builder

QMAKE_CLEAN += *.dylib

QML_IMPORT_PATH += $$OUT_PWD/../fluid/fluid/qml
QML_IMPORT_PATH += $$OUT_PWD/../dummy/qmlextensionplugins/import
