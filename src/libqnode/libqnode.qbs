import qbs.base

QNodeLibrary {
 name: "qnode"

 Depends { name: "Qt"; submodules: ["qml", "concurrent"] }

 Export {
        Depends { name: "cpp" }
        cpp.includePaths: '.'
}

 files: [
     "libqnode.qrc",

     "src/jsvalueutils.cpp",
     "src/utils.cpp",
     "src/engine/moduleloader.cpp",
     "src/engine/nodeengine.cpp",
     "src/engine/nodeeventloop.cpp",
     "src/modules/coreprovider.cpp",
     "src/modules/processmodule.cpp",
     "src/modules/timermodule.cpp",
     "src/modules/consolemodule.cpp",
     "src/engine/enginecontext.cpp",
     "src/modules/utilmodule.cpp",
     "src/modules/basemodule.cpp",
     "src/modules/assertmodule.cpp",
     "src/modules/fsmodule.cpp",
     "src/modules/typedarraymodule.cpp",
     "src/testRunner/testcase.cpp",
     "src/testRunner/testresult.cpp",
     "src/testRunner/testrunner.cpp",

     "src/jsvalueutils.h",
     "src/utils.h",
     "src/nodemodule.h",
     "src/moduleprovider.h",
     "src/engine/moduleloader.h",
     "src/engine/nodeengine.h",
     "src/engine/nodeeventloop.h",
     "src/modules/coreprovider.h",
     "src/modules/processmodule.h",
     "src/modules/timermodule.h",
     "src/modules/consolemodule.h",
     "src/engine/enginecontext.h",
     "src/engine/inodeengine.h",
     "src/modules/utilmodule.h",
     "src/modules/basemodule.h",
     "src/modules/assertmodule.h",
     "src/modules/fsmodule.h",
     "qnode.h",
     "src/modules/typedarraymodule.h",
     "src/testRunner/testcase.h",
     "src/testRunner/testresult.h",
     "src/testRunner/testrunner.h",
     "src/testRunner/tapetest.h"
 ]
}
