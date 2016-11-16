import QtQuick 2.2
import QtQuick.Controls 1.2
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


    TableView {
        anchors.top: row.bottom
        height: window.height
        width: window.width

        TableViewColumn {
            role: "title"
            title: "Title"
            width: 100
        }
        TableViewColumn {
            role: "completed"
            title: "Completed"
            width: 100
        }
        itemDelegate: Item {
            Text {
                anchors.verticalCenter: parent.verticalCenter
                color: styleData.textColor
                elide: styleData.elideMode
                text: styleData.value
            }
        }
        onDoubleClicked: {
            const i = table.currentRow;
            const todo = m.at(i);
            store.dispatch("flipCompleted", todo.id);
        }
        model: m
        id: table
    }

}
