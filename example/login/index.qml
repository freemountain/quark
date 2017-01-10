import QtQuick 2.2
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3
import Quark 1.0

ApplicationWindow {
    id:      window
    visible: true
    width:   store.value.width

    Gluon {
        /*
          This component holds the application state.
          The property value holds the current value.
          The slot dispatch can be called to emit an action.
        */
        id: store
    }

    RowLayout {
        id:           input
        anchors.fill: parent

        Label {
            Layout.fillWidth:    true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment:   Text.AlignVCenter
            text:                JSON.stringify(store.value.security.loggedIn);
        }

        TextField {
            id:               username
            Layout.fillWidth: true
            text:             ""
            placeholderText:  "Username"
            visible:          !store.value.security.loggedIn
        }

        TextField {
            id:               password
            Layout.fillWidth: true
            text:             ""
            placeholderText:  "Password"
            visible:          !store.value.security.loggedIn
        }

        Button {
            text: "Login"
            
            onClicked: {
                if(username.text == "" || password.text == "") return;

                store.trigger("login", {
                    username: username.text,
                    password: password.text
                });
            }

            visible: !store.value.security.loggedIn
        }

        Button {
            text: "Logout"
            
            onClicked: {
                store.trigger("logout");
            }

            visible: store.value.security.loggedIn
        }
    }

    RowLayout {
        anchors.bottom: input.bottom
        anchors.right:  input.right
        anchors.left:   input.left

        Label {
            Layout.fillWidth:    true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment:   Text.AlignVTop
            text:                store.value.errors.shift().message
        }
    }
}
