import qbs.base
import qbs.Probes

QNodeApplication {
  type: ["application", "autotest",  "app_deps"]
  name: "QNodeTest"

  Depends { name: "Qt"; submodules: ["quick", "testlib"] }
  Depends { name: "qnode" }
  Depends { name: "cpp" }

  Probes.NodeJsProbe {
      id: nodejs
  }

  Probes.NpmProbe {
      id: npm
  }
  Probes.BinaryProbe {
    id: wget
    names: ['wget']
  }

  cpp.defines: {
    print("ok", npm.path)
    return ['SRCDIR="' + product.sourceDirectory + '"']
  }
  bundle.isBundle: false

  files : [
      "main.cpp",
      "jstests.h",
      "jsvalueutilstest.h"
  ]

}
