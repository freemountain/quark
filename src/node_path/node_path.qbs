import qbs.base
import qbs.FileInfo
import qbs.File
import qbs.Probes
import qbs.ModUtils

QNodeNpmPkg {
  name: "node_path"

  Group {
     name: "out"
     fileTagsFilter: ["npm_pkg.node_path"]
     qbs.install: true
     qbs.installSourceBase: product.destinationDirectory
     qbs.installDir: "node_path"
  }

  Group {
     name: "input"
     files: ["./**"]
     fileTags: ["npm_pkg_input"]
  }
}
