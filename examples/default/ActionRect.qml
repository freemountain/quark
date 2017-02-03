import QtQuick 2.6
import QtQuick.Controls 2.0

Item {
    id:                   item
    property string text: ""

    property color color

    signal action(string url)

    Rectangle {
        id:           background;
        color:        item.color
        anchors.fill: parent

        DropArea {
            anchors.fill: parent;

            onEntered: {
                background.color = Qt.darker(item.color)

                drag.accept (Qt.CopyAction);
            }

            onDropped: {
                item.action(drop.urls[0].slice(7));

                background.color = item.color;
            }

            onExited: {
                background.color = item.color;
            }
        }

        Label {
            text:                     item.text
            font.pointSize:           24
            font.bold:                true
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter:   parent.verticalCenter
        }
    }
}
