
import qbs
import qbs.Environment
import qbs.File
import qbs.FileInfo
import qbs.Probes

Module {



    Rule {
        inputs: ["resource.input-list"]

        Artifact {
            filePath: FileInfo.joinPaths(product.moduleProperty("archiver", "outputDirectory"),
                              product.moduleProperty("archiver", "archiveBaseName") + '.'
                                         + product.moduleProperty("archiver", "archiveExtension"));
            fileTags: ["archiver.archive"]
        }

        Artifact {
            fileTags: ["archiver.archive"]
            filePath: {
              /*var name = FileInfo.relativePath(input.filePath, product.sourceDirectory) +
                       "/" + input.fileName + ".processed";

                */

                var name =        
              print("name:", name);

              return name;
            }
        }

        prepare: {
            var binary = product.moduleProperty("archiver", "command");
            var binaryName = FileInfo.baseName(binary);
            var args = [];
            var commands = [];
            var type = product.moduleProperty("archiver", "type");
            var compression = product.moduleProperty("archiver", "compressionType");
            var compressionLevel = product.moduleProperty("archiver", "compressionLevel");
            if (binaryName === "7z") {
                var rmCommand = new JavaScriptCommand();
                rmCommand.silent = true;
                rmCommand.sourceCode = function() {
                    if (File.exists(output.filePath))
                        File.remove(output.filePath);
                };
                commands.push(rmCommand);
                args.push("a", "-y", "-mmt=on");
                switch (type) {
                case "7zip":
                    args.push("-t7z");
                    break;
                case "zip":
                    args.push("-tzip");
                    break;
                case "tar":
                    if (compression === "gz")
                        args.push("-tgzip");
                    else if (compression === "bz2")
                        args.push("-tbzip2");
                    else
                        args.push("-ttar");
                    break;
                default:
                    throw "7zip: unrecognized archive type: '" + type + "'";
                }

                if (compressionLevel)
                    args.push("-mx" + compressionLevel);
                args = args.concat(product.moduleProperty("archiver", "flags"));
                args.push(output.filePath);
                args.push("@" + input.filePath);
            } else if (binaryName === "tar" && type === "tar") {
                args.push("-c");
                if (compression === "gz")
                    args.push("-z");
                else if (compression === "bz2")
                    args.push("-j");
                else if (compression === "Z")
                    args.push("-Z");
                else if (compression === "xz")
                    args.push("-J");
                args.push("-f", output.filePath, "-T", input.filePath);
                args = args.concat(product.moduleProperty("archiver", "flags"));
            } else if (binaryName === "jar" && type === "zip") {
                if (compression === "none" || compressionLevel === "0")
                    args.push("-0");

                args.push("-cfM", output.filePath, "@" + input.filePath);
                args = args.concat(product.moduleProperty("archiver", "flags"));
            } else if (binaryName === "zip" && type === "zip") {
                // The "zip" program included with most Linux and Unix distributions
                // (including macOS) is Info-ZIP's Zip, so this should be fairly portable.
                if (compression === "none") {
                    args.push("-0");
                } else {
                    compression = compression === "bz2" ? "bzip2" : compression;
                    if (["store", "deflate", "bzip2"].contains(compression))
                        args.push("-Z", compression);

                    if (compressionLevel)
                        args.push("-" + compressionLevel);
                }

                args.push("-r", output.filePath, ".", "-i@" + input.filePath);
                args = args.concat(product.moduleProperty("archiver", "flags"));
            } else if (["tar", "zip", "jar"].contains(binaryName)) {
                throw binaryName + ": unrecognized archive type: '" + type + "'";
            } else {
                throw "unrecognized archive tool: '" + binaryName + "'";
            }

            var archiverCommand = new Command(binary, args);
            archiverCommand.description = "Creating archive file " + output.fileName;
            archiverCommand.highlight = "linker";
            archiverCommand.workingDirectory
                    = product.moduleProperty("archiver", "workingDirectory");
            commands.push(archiverCommand);
            return commands;
        }
    }
}
