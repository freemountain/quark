import QtQuick 2.10
import QtQuick.Controls 2.3
import QtQuick.Controls.Material 2.2
import QtQuick.Layouts 1.3

import Fluid.Controls 1.0 as FluidControls
import TimeExample 1.0

FluidControls.ApplicationWindow {
    width: 640
    height: 480
    title: qsTr("Hello Worsld")
    visible: true

    TimeExample.Clocks {

    }

    initialPage: FluidControls.TabbedPage {
        title: qsTr("Tabbed Page")

        actions: [
            FluidControls.Action {
                icon.source: FluidControls.Utils.iconUrl("content/add")
                text: qsTr("Add content")
                toolTip: qsTr("Add content")
                onTriggered: console.log("Example action...")
            }
        ]

        FluidControls.Tab {
            title: qsTr("First")

            Page1 {
                anchors.fill: parent
            }
        }

        FluidControls.Tab {
            title: qsTr("Second")

            Label {
                text: qsTr("Second page")
                anchors.centerIn: parent
            }
        }
    }
}
