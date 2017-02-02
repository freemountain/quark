import QtQuick 2.6

Item {
    id: item
    property var value: QtObject

    function trigger(type, payload) {
        backend.trigger(type, payload);
    }

    Component.onCompleted: {
        item.value = backend.value;
        backend.valueChanged.connect(function(value) {
            item.value = value;
        });
    }
}
