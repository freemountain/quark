import qbs.base 1.0
import qbs.FileInfo
import qbs.ModUtils
import qbs.TextFile

Product {
  type: ["archiver.archive"]
  builtByDefault: true
  Depends { name: "archiver" }
  archiver.type: "tar"
  archiver.workingDirectory: qbs.installRoot

  property string _deps : "resource.input"
  Rule {
      multiplex: true
      inputsFromDependencies: [_deps]
      Artifact {
          filePath: product.name + ".tarlist"
          fileTags: ["archiver.input-list"]
      }
      prepare: {
          var cmd = new JavaScriptCommand();
          cmd.silent = true;
          cmd.sourceCode =function() {
              var ofile = new TextFile(output.filePath, TextFile.WriteOnly);
              try {
                  for (var i = 0; i < inputs[_deps].length; ++i) {
                      var inp = inputs[_deps][i];
                      var installRoot = inp.moduleProperty("qbs", "installRoot");
                      var installedFilePath = ModUtils.artifactInstalledFilePath(inp);
                      ofile.writeLine(FileInfo.relativePath(installRoot, installedFilePath));
                  }
              } finally {
                  ofile.close();
              }
          };
          return [cmd];
      }
  }
}
