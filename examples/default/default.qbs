import qbs.base
import qbs.FileInfo
import qbs.File
import qbs.Probes
import qbs.ModUtils

QNodeNpmPkg {
  name: "default"

  Group {
     name: "out"
     fileTagsFilter: ["npm_pkg.default"]
     qbs.install: true
     qbs.installSourceBase: product.destinationDirectory
     qbs.installDir: "default"
  }

  Group {
     name: "input"
     files: ["./**"]
     fileTags: ["npm_pkg_input"]
  }
}
