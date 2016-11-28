import QtQuick 2.7
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3

ApplicationWindow {
    id:      window
    visible: true
    width:   300
    title: "Console"

    function appendLogLine(msg, topic) {
        logModel.append({ msg: msg, topic: topic });
        logView.flick(0,-200000);
    }

    ListModel {
        id: logModel
    }
    ListView {
        id: logView
        anchors.fill: parent
        model: logModel
        clip: true

        delegate:RowLayout{
            width: logView.width
            TextEdit {
                Layout.fillWidth: false
                Layout.fillHeight: false
                anchors.top: parent.top
                font.bold: true
                text: topic
            }
            TextEdit {
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                selectByMouse: true
                text: msg
            }
        }
    }
}
