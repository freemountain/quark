import QtQuick 2.6
import QtQuick.Controls 2.0
import QtQuick.Controls.Material 2.0
import QtQuick.Dialogs 1.1
import Quark 1.0

ApplicationWindow {
    visible: true
    width: 300
    height: 200
    id:window

    Gluon {
        id: store
    }

    ActionRect {
        id:          run;
        height:      window.height / 2
        width:       window.width
        anchors.top: window.top
        color:       "lightsteelblue"
        text:        "Run"

        onAction: {
            store.trigger("startProcess", url);
        }
    }

    ActionRect {
        id:          deploy
        color:       "steelblue"
        height:      window.height / 2
        width:       window.width
        anchors.top: run.bottom
        text:        "Deploy"

        property var pkgPath
        property var targetPath

        onAction: {
            fd.visible     = true;
            deploy.pkgPath = url
        }

        FileDialog {
            id:           fd
            title:        "Please choose output directory"
            folder:       shortcuts.home
            selectFolder: true

            onAccepted: {
                deploy.targetPath = fd.fileUrls[0].slice(7) // contains file:///User/..
                md.visible        = true;
                fd.visible        = false;

                store.trigger("deployApp", {
                  pkg:    deploy.pkgPath,
                  target: deploy.targetPath
                });
            }

            onRejected: {
                fd.visible = false;
            }
        }

        MessageDialog {
            id:    md
            title: "Bundling..."
            text:  "Deplyed " + deploy.pkgPath + " to " + deploy.targetPath
        }
    }
}
