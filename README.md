
# Quark [![Build Status](https://travis-ci.org/freemountain/quark.svg?branch=master)](https://travis-ci.org/freemountain/quark)
## :arrow_right: electron :heavy_minus_sign: chromium :heavy_plus_sign: Qt quick

Quark is the easiest way to write and ship cross-platform desktop applications using JavaScript and QML. It uses Node.js 7.0 and Qt 5.7 under the hood.

## How does it work
A Quark application consists of a JavaScript host process and a QML-based rendering process.

The host process can be powered by Node.js or the Qt JavaScript engine V4 with an Node.js like api (currently wip, see src/libqnode).

This architecture is used to make it possible to script the whole application logic in JavaScript, while leveraging QT's declarative, cross-platform view-layer (QML).
Both processes are always being aware of the whole application state (think Elm or Redux), using stdin and stdout to exchange updates and or actions in a unidirectional way.

To wrap it all up, a basic Quark application just needs three files in order to work:


- a `package.json` - points to the app's main file and lists its details and dependencies
- a `<main>.js` - contains the business logic
- an `index.qml` - QML description of the view

## Example
So let's implement a very primitive counter as a basic example of how to use this thing:

### [package.json](https://github.com/freemountain/quark/blob/master/example/counter/package.json)
```json
{
  "name"    : "counter",
  "version" : "0.1.0",
  "main"    : "main.js",
  "scripts": {
    "run": "quark-prebuilt ./package.json",
  },
  "dev-dependencies": {
    "quark-prebuilt": "0.0.3"
  }
}
```

### [main.js](https://github.com/freemountain/quark/blob/master/example/counter/main.js)
```js
const Quark = require("quark");
const path  = require("path");

Quark.of({
    qml:          path.join(__dirname, "index.qml"),
    initialState: { count: 0 },
    intents:      {
        onSub: state => state.update("count", count => count - 1),
        onAdd: state => state.update("count", count => count + 1)
    }
});
```

### [index.qml](https://github.com/freemountain/quark/blob/master/example/counter/index.qml)
```qml
import QtQuick 2.2
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.3
import Quark 1.0

ApplicationWindow {
    visible: true
    width: 300
    id:window

    Store {
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
            text: "-"
            onClicked: store.dispatch("sub")
        }
        Label {
            Layout.fillWidth: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            text: JSON.stringify(store.value.count);
        }
        Button {
            text: "+"
            onClicked: store.dispatch("add")
        }
    }
}
```

### Running
```bash
npm install
npm run
```

## Downloads
Prebuilt binaries can be found on the [releases page](https://github.com/freemountain/quark/releases).
