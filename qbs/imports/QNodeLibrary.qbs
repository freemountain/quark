import qbs.base 1.0
import qbs.FileInfo

QNodeProduct {
    type: Qt.core.staticBuild ? "staticlibrary" : "dynamiclibrary"
    Depends { name: "cpp" }
    Depends { name: "bundle" }

    bundle.isBundle: project.frameworksBuild
    cpp.rpaths: {
      if(!qbs.targetOS.contains("darwin")) return [ "lib/"];

      var libPrefix = bundle.isBundle ? "@executable_path/../Frameworks" :  "@executable_path/../lib"

      return [ Qt.core.libPath, "@executable_path/../Frameworks",  "@executable_path/../lib" ];
    }
    cpp.sonamePrefix: qbs.targetOS.contains("darwin")
      ? "@rpath"
      : undefined
}
