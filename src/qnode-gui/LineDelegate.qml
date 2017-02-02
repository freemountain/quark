import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import QtQuick.Controls.Material 2.0

Rectangle {
    id: lineDelegate
    property int lines: 1
    property var _delegate: loader
    width: parent.width
    height: box.height

    Rectangle {
        id: box
        width: loader.item.width + 20
        height: loader.item.height + 20

        color: switch(type) {
            case "input": return Material.color(Material.Blue)
            case "err": return Material.color(Material.Red)
            case "out": return Material.color(Material.Grey)
        }

        Loader{
            id: loader
            sourceComponent: switch(type) {
                case "input": return inputDelegate
                case "result": return resultDelegate
                case "out": return outDelegate
                case "err": return errDelegate
            }
        }
    }




    Component{
        id: inputDelegate
        ColumnLayout {
            height: inputLabel.implicitHeight + outputLabel.implicitHeight + spacing
            width: Math.max(inputLabel.implicitWidth, outputLabel.implicitWidth)
            spacing: 10

            Label {
                id: inputLabel
                Layout.fillWidth: true
                text: "> " + msg
                background: Rectangle {
                    anchors.fill: parent
                    color: Material.color(Material.Blue)
                }
            }
            Label {
                id: outputLabel
                Layout.fillWidth: true
                text: ">A " + result
                background: Rectangle {
                    anchors.fill: parent
                    color: Material.color(Material.Grey)
                }
            }
        }


}

    Component {
        id: outDelegate
        Label {
            text: msg
        }
    }

    Component {
        id: errDelegate
        Label {
            text: msg
        }
    }
}
