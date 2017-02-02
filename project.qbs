import qbs.FileInfo
import qbs

Project {
    minimumQbsVersion: "1.6"
    AutotestRunner { }

    property stringList includePaths: []

    qbsSearchPaths: ["qbs"]
    references: [
        "qbs/vendor/gel.qbs",
        "qbs/vendor/node.qbs",

        "src/qnode-cli/qnode-cli.qbs",
        "src/qnode-gui/qnode-gui.qbs",
        "src/quark-gui/quark-gui.qbs",

        "src/libqnode/libqnode.qbs",
        "src/libquark/libquark.qbs",

        "src/node_path/node_path.qbs",
        "examples/default/default.qbs",

        "test/tests.qbs"
    ]

}
