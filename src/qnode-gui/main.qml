import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import QtQuick.Controls.Material 2.0

ApplicationWindow {
    visible: true
    width: 640
    height: 480
    title: qsTr("Hello World")

    Material.theme: Material.Dark

    signal submitInput(int id, string text)

    function addStdOut(msg) {
        model.append({ type: "out", msg: msg});
    }

    function addStdErr(msg) {
        model.append({ type: "err", msg: msg});
    }

    function addResult(id, result) {
        console.log("add", model.get(id));
        model.get(id).result = result
    }

    function onRun() {
        var id = model.count;
        model.append({ type: "input", msg: textField1.text, result: undefined });
        submitInput(id, textField1.text)
        textField1.text = '';
        listView.positionViewAtEnd();
    }


    ListModel {
        id: model
        dynamicRoles: true
        /*
        ListElement {
            msg: "var a = 4;"
            type: "input"
        }
        ListElement {
            msg: "4"
            type: "returned"
        }
        ListElement {
            msg: "'Sam Wise'"
            type: "log"
        }
       */
    }

    ColumnLayout {
        anchors.fill: parent

        ListView {
            id:listView
            clip: true
            model: model
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 10
            delegate: LineDelegate{}

        }

        Pane {
            id: pane
            Layout.fillWidth: true
            background: Rectangle {
                anchors.fill: parent
                color:   Material.color(Material.Grey)
            }

            RowLayout {
                anchors.bottom: parent.bottom
                anchors.left: parent.left
                anchors.right: parent.right

                TextArea {
                    Layout.fillWidth: true
                    id: textField1
                    Keys.onReturnPressed: onRun()
                }

                Button {
                    id: button1
                    text: qsTr("Run")
                    onClicked: onRun()
                    enabled: textField1.length > 0

                }
            }
        }
    }



}
