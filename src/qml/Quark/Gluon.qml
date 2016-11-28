import QtQuick 2.6

import "inspect.js" as Inspect

Item {
    id: item
    property var value: QtObject

    function trigger(type, payload) {
        backend.trigger(type, payload);
    }

    function log() {
        const args = Array.prototype.slice.call(arguments);
        const arg = args.length === 1 ? args[0] : args;

        backend.log(Inspect.inspect_(arg));
    }

    Component.onCompleted: {
        item.value = backend.value;
        backend.valueChanged.connect(function(value) {
            item.value = value;
        });
    }
}
