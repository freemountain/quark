import QtQuick 2.2
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import QtQuick.Dialogs 1.1
import QtQuick.Window 2.1
import Quark 1.0

ApplicationWindow {
    visible: true
    width: 640
    height: 480
    id:window

    Store {
        id: store
    }

    ListModel {
        id: m
        path: "$"
    }

    RowLayout {
      id: row
      width: window.width

      TextField {
        Layout.fillWidth: true

        id: textField
        text: ""
        placeholderText: "add todo item..."
      }
      Button {
          text: "Add"
          onClicked: {
              if(textField.text == "") return;
              store.dispatch("addTodo", textField.text)
              textField.text = ""
          }
      }
    }
    ListView {
        anchors.top: row.bottom
        height: window.height - row.height
        width: window.width
        leftMargin: 12
        rightMargin: 12
        model: m
        id:listView

        delegate: RowLayout {
            CheckBox {
                id:checkBox
                checked: completed
                onClicked: store.dispatch('flipCompleted', id)
            }
            Label {
                text: title
            }
        }
    }
}
