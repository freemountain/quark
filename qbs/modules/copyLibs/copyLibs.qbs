import qbs.base
import qbs.TextFile
import qbs.FileInfo

Module {
    Rule {
        //multiplex: false
        inputsFromDependencies: ["installable"]
        //inputsFromDependencies: ["cpp", "bundle"]
        
        Artifact {
            fileTags: ["libbs"]
            filePath: {
              var name = FileInfo.relativePath(input.filePath, product.sourceDirectory) +
                       "/" + input.fileName + ".processed"
              print("name:", name);

              return name;
            }
        }

        prepare: {
            var cmd = new JavaScriptCommand();
              cmd.sourceCode = function() {

                print("copyLibs",input.filePath)
                var inFile = new TextFile(input.filePath);
                inFile.close()


                var outFile = new TextFile(output.filePath);
                outFile.writeLine("};\n");
                outFile.close();
            }

            return cmd;
        }
    }
}
