import qbs.base 1.0
import qbs.TextFile
import qbs.Probes
import qbs.ModUtils
import qbs.FileInfo
import qbs.File

Product {
  name: 'extern_node'
  type: 'extern_bin'
  Depends { name: "cpp" }

  Probes.BinaryProbe {
    id: wget
    names: 'wget'
  }

  Probes.BinaryProbe {
    id: tar
    names: 'tar'
  }

  property string wgetBin: wget.filePath
  property string tarBin: tar.filePath

  property string nodeVersion: 'v7.5.0'
  property string baseUrl: 'https://nodejs.org/dist/' + nodeVersion + '/'

  property string linux_x86: 'node-v7.5.0-linux-x86.tar.xz'
  property string linux_x64: 'node-v7.5.0-linux-x64.tar.xz'
  property string mac_x64:   'node-v7.5.0-darwin-x64.tar.gz'
  property string win_x86:   'win-x86/node.exe'

  property string targetArchive: {
    if(qbs.targetOS.contains('darwin')) return mac_x64;
    if(qbs.targetOS.contains('windows')) return win_x86;
    if(qbs.targetOS.contains('linux') && cpp.architecture.contains('x86_64'))
      return linux_x64;
    if(qbs.targetOS.contains('linux') && cpp.architecture.contains('x86'))
      return linux_x86;
    throw new Error('ohhhhh');
  }

  Rule {
    condition: qbs.targetOS.contains('windows')
    multiplex: true
    Artifact {
        filePath: 'node.exe'
        fileTags: ["extern_bin"]
    }

    prepare: {
      var url = product.baseUrl + product.targetArchive;
      var dl = new Command(product.wgetBin, [url]);
      dl.workingDirectory = FileInfo.path(output.filePath)

      return [dl];
    }
  }

  Rule {
    condition: !qbs.targetOS.contains('windows')
    multiplex: true
    Artifact {
        filePath: product.targetArchive
        fileTags: ["extern_node_archive"]
    }

    prepare: {
      var url = product.baseUrl + product.targetArchive;
      var dl = new Command(product.wgetBin, [url]);
      dl.workingDirectory = FileInfo.path(output.filePath)

      return [dl];
    }
  }

  Rule {
    condition: !qbs.targetOS.contains('windows')
    inputs: ["extern_node_archive"]
    Artifact {
        filePath: {
          var token = product.targetArchive.split('.');
          var outputDir = token.slice(0, token.length - 2).join('.');

          return outputDir + '/bin/node';
        }
        fileTags: ["extern_bin"]
    }

    prepare: {
        var args = [ 'xpvf', product.targetArchive, '-C', '.' ]
        var extract = new Command(product.tarBin, args);
        extract.workingDirectory = FileInfo.path(input.filePath)
        extract.silent = true;

        return [extract];
    }
  }
}
