# Quark
## :arrow_right: electron :heavy_minus_sign: chromium :heavy_plus_sign: Qt quick

Quark is the easiest way to write and ship cross-platform desktop applications using JavaScript and QML. It uses Node.js 7.0 and Qt 5.7 under the hood.

## How does it work
A Quark application consists of a Node.js host process and a QML-based rendering process.

This architecture is used to make it possible to script the whole application logic in JavaScript, while leveraging QT's declarative, cross-platform view-layer (QML).
Both processes are always being aware of the whole application state (think Elm or Redux), using stdin and stdout to exchange updates and or actions in a unidirectional way.

To wrap it all up, a basic Quark application just needs three files in order to work:


- a `package.json` - points to the app's main file and lists its details and dependencies
- a `<main>.js` - contains the business logic
- an `index.qml` - QML description of the view

## Example
So let's implement a very primitive counter as a basic example of how to use this thing:

### [package.json](https://github.com/freemountain/quark/blob/master/apps/counter/package.json)
```json
{
  "name"    : "counter",
  "version" : "0.1.0",
  "main"    : "main.js"
}
```

### [main.js](https://github.com/freemountain/quark/blob/master/apps/counter/main.js)
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

### [index.qml](https://github.com/freemountain/quark/blob/master/apps/counter/index.qml)
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
### Running the Example

This example can either be run by using the GUI app or by invoking the terminal.

#### GUI
- run the prebuilt quark app
- drag&drop the package.json on the __run__ button

#### Terminal
```
./path/to/quark ./path/to/package.json
```

## Downloads
Prebuilt binaries for OSX can be found on the releases page.

## Development
## Building
### Requirements
- Qt 5.7

### OSX
```bash
export PATH=$PATH:/path/to/Qt/5.7/clang_64/bin
./tools/bootstrap.sh
mkdir build
cd build
qmake ..
make
#if you want to deploy:
./../tools/deploy_mac.sh quark.app /path/to/node
```

### WIN (using mingw)
The created executable will only run on systems with Qt installed. The windeployqt script (called from tools/deploy_win.sh) dosent works.

```bash
export PATH=$PATH:/c/Qt/5.7/mingw53_32/bin
export PATH=$PATH:/c/Qt/Tools/mingw530_32/bin
./tools/bootstrap.sh
mkdir build
cd build
qmake ..
make
#if you want to deploy:
./../tools/deploy_win.sh quark.exe /path/to/node.exe
```

### Linux (Ubuntu 16.04)
```bash
export PATH=/path/to/Qt/5.7/clang_64/bin:/path/to/linuxdeployqt:$PATH
sudo apt-get install mesa-common-dev libglu1-mesa-dev patchelf
./tools/bootstrap.sh
mkdir build
cd build
qmake ..
make
#if you want to deploy:
./../tools/deploy_linux.sh quark
```
