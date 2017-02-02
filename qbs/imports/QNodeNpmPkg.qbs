import qbs.base
import qbs.FileInfo
import qbs.File
import qbs.Probes
import qbs.ModUtils

Product {
  type: ["npm_pkg." + name, "installable", "npm_pkg_dep", "resource"]


  Probes.NodeJsProbe {
    id: nodejs
  }

  Probes.NpmProbe {
    id: npm
  }

  property string npmPath: npm.filePath

  Group {
     name: "npm pgk resource"
     fileTagsFilter: ["npm_pkg." + product.name]
     qbs.install: true
     qbs.installSourceBase: product.destinationDirectory
     qbs.installDir: product.name
  }

  Rule {
      inputs:["npm_pkg." + product.name]

      Artifact {
          filePath: FileInfo.joinPaths(product.name, input.baseDir, input.fileName)
          fileTags: ["resource"]
      }

      prepare: {
        var cmd = new JavaScriptCommand();

        cmd.sourceCode = function() {
          File.copy(input.filePath, output.filePath);
        };
        cmd.silent = true;

        return [cmd];
      }
  }


Rule {
    inputs:["npm_pkg_json"]

    outputArtifacts: {

        function scan(path, l) {
          var dirs = File.directoryEntries(path, File.Dirs)
          .filter(function(d) {
            return d !== "." && d !== "..";
          }).map(function(d) {
            var p = FileInfo.joinPaths(path, d);
            l.push(p);
            return p;
          });

          dirs.forEach(function(p) {
            scan(p, l);
          });
        }

        function read(p) {
          var files = File.directoryEntries(p, File.Files)
          .filter(function(d) {
            return d !== "." && d !== "..";
          })

          return files.map(function(f) {
            var path =  FileInfo.joinPaths(p, f);
            return {
              filePath: path,
              fileTags: ["npm_pkg_dep", "npm_pkg." + product.name]
            };
          });
        }
        var nodeModulesPath = FileInfo.joinPaths(FileInfo.path(input.filePath), "node_modules");
        var l = []
        scan(nodeModulesPath, l);
        l = l.map(read).reduce(function(acc, cur) {
          return acc.concat(cur);
        });

        return l;
    }

    outputFileTags: ["npm_pkg_dep", "npm_pkg." + product.name]

    prepare: {
      var cmd = new JavaScriptCommand();

      cmd.sourceCode = function() {};
      cmd.silent = true;

      return [cmd];
    }
}

  Rule {
      inputs:["npm_pkg_input"]

      outputArtifacts: {
          var outBase = input.baseDir;
          var tags = ["installable", "npm_pkg." + product.name];
          var filePath= FileInfo.joinPaths(product.destinationDirectory, outBase, input.fileName)
          var copyArtifact = { filePath: filePath, fileTags: tags };

          var nodeModulesArtifact = {
            filePath: FileInfo.joinPaths(product.destinationDirectory, outBase, "node_modules/"),
            fileTags: tags
          };

          var artifacts = [copyArtifact];

          if(input.fileName === "package.json") {
            copyArtifact.fileTags.push("npm_pkg_json");
          }

          return artifacts;
      }

      outputFileTags: ["installable", "npm_pkg." + product.name, "npm_pkg_json"]

      prepare: {
        var outPath;
        var outName;
        var outTag = "npm_pkg." + product.name;

        if(!output) {
          outPath = FileInfo.path(outputs[outTag][0].filePath);
          outName = FileInfo.fileName(outputs[outTag][0].filePath);
        } else {
          outPath = FileInfo.path(output.filePath);
          outName = FileInfo.fileName(output.filePath);
        }

        var npmInstall = new Command(product.npmPath, ["install", "--only=production"]);
        npmInstall.workingDirectory = outPath
        npmInstall.description = "npm install " + outPath;
        npmInstall.highlight = "linker";

        var cmd = new JavaScriptCommand();
        cmd.silent = true;

        cmd.sourceCode = function() {
          var outPath;
          var outName;
          var outTag = "npm_pkg.node_path";

          if(!this.output) {
            outPath = FileInfo.path(this.outputs[outTag][0].filePath);
            outName = "package.json"
          } else {
            outPath = FileInfo.path(this.output.filePath);
            outName = FileInfo.fileName(this.output.filePath);
          }

          File.copy(input.filePath, outPath + "/" + outName);
        };

        var commands = [cmd];
        if(input.fileName === "package.json")  commands.push(npmInstall)

        return commands;
      }
  }

}
