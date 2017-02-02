import QtQuick 2.2
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3
import Quark 1.0

ApplicationWindow {
    id:      window
    visible: true
    width:   300

    Gluon {
        /*
          This component holds the application state.
          The property value holds the current value.
          The slot dispatch can be called to emit an action.
        */
        id: store
    }

    RowLayout {
        anchors.fill: parent

        Button {
            anchors.left: window.left
            text:         "-"

            onClicked: store.trigger("sub")
        }
        Label {
            Layout.fillWidth:    true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment:   Text.AlignVCenter
            text:                JSON.stringify(store.value.count);
        }

        Button {
            text:      "+"
            onClicked: store.trigger("add")
        }
    }
}

