import qbs.base

QNodeApplication {
  name: "QnodeGui"

  Depends { name: "Qt"; submodules: ["quick"] }
  Depends { name: "qnode" }
  Depends { name: "cpp" }

  files : [
      "appcontroller.h",
      "appcontroller.cpp",
      "main.cpp",
      "qml.qrc"
  ]

}
