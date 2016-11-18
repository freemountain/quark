import QtQuick 2.2
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import QtQuick.Dialogs 1.1
import QtQuick.Window 2.1
import Quark 1.0

ApplicationWindow {
    id:      window
    visible: true
    width:   640
    height:  480

    Gluon {
        id: store
    }

    ListModel {
        id:   m
        path: "$['todos']"
    }

    RowLayout {
        id:    row
        width: window.width

        TextField {
            id:               textField
            Layout.fillWidth: true
            text:             ""
            placeholderText:  "add todo item..."
        }

        Button {
            text:      "Add"
            onClicked: {
                if(textField.text == "") return;

                store.trigger("addTodo", textField.text);
                textField.text = "";
            }
        }
    }

    ListView {
        id:          listView
        anchors.top: row.bottom
        height:      window.height - row.height
        width:       window.width
        leftMargin:  12
        rightMargin: 12
        model:       m
        delegate:    RowLayout {
            CheckBox {
                id:        checkBox
                checked:   completed
                onClicked: store.trigger('flipCompleted', id)
            }

            Label {
                text: title
            }
        }
    }
}
