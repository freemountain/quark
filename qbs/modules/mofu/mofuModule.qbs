import qbs.base
import qbs.TextFile
import qbs.FileInfo

Module {
    FileTagger {
        patterns: ["*.enum"]
        fileTags: ["enum"]
    }

    Rule {
        inputs: ["enum"]

        Artifact {
            fileTags: ["hpp"]
            filePath: input.fileName.replace(/enum$/,'h')
        }
        Artifact {
            fileTags: ["cpp"]
            filePath: input.fileName.replace(/enum$/,'cpp')
        }

        prepare: {
            var cmd = new JavaScriptCommand();
            cmd.description = "Generate enum class for" + FileInfo.fileName(input.filePath);
            cmd.highlight = "codegen";
            cmd.sourceCode = function() {
              //print("enum",Object.keys(outputs.cpp), outputs.cpp[0] )
                var inFile = new TextFile(input.filePath);

                // Load data
                var namespaceName = inFile.readLine();
                var enumName = inFile.readLine();
                var extraCode = inFile.readLine();
                var enumValues = [];
                var guardName = enumName.toUpperCase() + "_H";

                while (!inFile.atEof()) {
                    enumValues.push(inFile.readLine())
                }
                inFile.close()

                // Generate h file
                var headerFileName = outputs["hpp"][0].filePath;
                var headerFile = new TextFile(headerFileName, TextFile.WriteOnly);

                headerFile.writeLine("#ifndef " + guardName);
                headerFile.writeLine("#define " + guardName);
                headerFile.writeLine("#include <QMetaType>");
                headerFile.writeLine(extraCode);
                headerFile.writeLine("namespace " + namespaceName + " { ");
                headerFile.writeLine("enum class " + enumName + " {");
                headerFile.writeLine(enumValues.join(",\n"));
                headerFile.writeLine("};\n}");
                headerFile.writeLine("Q_DECLARE_METATYPE(" + namespaceName + "::" + enumName + ")");
                headerFile.writeLine("#endif");

                headerFile.close()

                // Generate cpp file
                var sourceFileName = outputs["cpp"][0].filePath;
                var sourceFile = new TextFile(sourceFileName, TextFile.WriteOnly);
                var fullEnumName = namespaceName + "::" + enumName;

                sourceFile.writeLine("#include \"" + headerFileName + "\"");
                sourceFile.writeLine("#include <metaenum.h>");
                sourceFile.writeLine("template<>");
                sourceFile.writeLine("int ACT::MetaEnumData<" + fullEnumName + ">::countKeys = " + enumValues.length + ";");
                sourceFile.writeLine("template<>");
                sourceFile.writeLine("const char* ACT::MetaEnumData<" + fullEnumName + ">::name = \"" + enumName + "\";");
                sourceFile.writeLine("template<>");
                sourceFile.writeLine(fullEnumName + " ACT::MetaEnumData<" + fullEnumName + ">::values[] = {");

                for (var i in enumValues) {
                    sourceFile.writeLine(fullEnumName + "::" + enumValues[i] + ",");
                }

                sourceFile.writeLine("};");
                sourceFile.writeLine("template<>");
                sourceFile.writeLine("const char* ACT::MetaEnumData<" + fullEnumName + ">::keys[] = {");

                for (var i in enumValues) {
                    sourceFile.writeLine("\"" + enumValues[i] + "\",");
                }
                sourceFile.writeLine("};\n");

                sourceFile.close();
            }

            return cmd;
        }
    }
}
