import qbs.base
import qbs.FileInfo
import qbs.File
import qbs.Probes
import qbs.ModUtils

QNodeApplication {
  name: "QuarkGui"

  Depends { name: "Qt"; submodules: ["quick", "qml"] }
  Depends { name: "quark" }
  Depends { name: "cpp" }
  Depends { name: "node_path" }
  Depends { name: "default" }
  Depends { name: "extern_node" }

  files : [
      "main.cpp"
  ]

}
