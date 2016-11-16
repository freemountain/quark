# Quark
## :arrow_right: electron :heavy_minus_sign: chromium :heavy_plus_sign: Qt quick
The Quark shell lets you write and pack cross-platform desktop applications using JavaScript and QML. It is based on Node.js 7.0 and Qt 5.7.

## How does it works
A Quark application consist of a node.js process and a qml render process. They communicate through stdin and stdout in a redux like manner. The node process acts like a store, it emits a value and can react to actions. The qml process listen on value changes and can dispatch actions on user events to the store.


## Downloads
Prebuilt binaries for OSX can be found on the releases page.

## Basic Example
A basic Quark application needs just these files:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a Qt window to render QML.
- `index.qml` - A qml window to render

### package.json
```json
{
  "name"    : "counter",
  "version" : "0.1.0",
  "main"    : "main.js"
}
```

### main.js
```js
const shell = require('quark-shell');
const path = require('path');

shell((values, actions, qml) => {
  // initial state
  const value = {
    count: 0
  }

  // emit initial state
  values.emit('data', value);

  // subscribe to actions
  actions.on('data', action => {
    if(action.type === 'add') value.count += 1
    if(action.type === 'sub') value.count -= 1

    // emit new state
    values.emit('data', value);
  });

  // load application window
  qml.load(path.join(__dirname, 'index.qml'));
});
```

### index.qml
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
### run the example
#### Gui
- run the prebuilt quark app
- drop the package.json on __run__

#### Terminal
```
./path/to/quark ./path/to/package.json
```

## Building

### OSX
```bash
export PATH=$PATH:/path/to/Qt/5.7/clang_64/bin
qpm install
mkdir build
cd build
qmake ..
make
#if you want to deploy:
./../tools/deploy_mac.sh quark.app /path/to/node
```
