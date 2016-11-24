import QtQuick 2.2
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3
import Quark 1.0

ApplicationWindow {
    id:      window
    visible: true
    width:   300

    TextArea {
        anchors.fill: parent
        text:
            "Lorem ipsum dolor sit amet, consectetur adipisicing elit, " +
            "sed do eiusmod tempor incididunt ut labore et dolore magna " +
            "aliqua. Ut enim ad minim veniam, quis nostrud exercitation " +
            "ullamco laboris nisi ut aliquip ex ea commodo cosnsequat. ";
    }
}
