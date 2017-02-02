import qbs.base

QNodeApplication {
  name: "QNode"

  Depends { name: "Qt"; submodules: ["quick"] }
  Depends { name: "qnode" }
  Depends { name: "cpp" }

  files : [
      "app.cpp",
      "app.h",
      "main.cpp",
      "repl.h",
      "repl.cpp"
  ]

}
