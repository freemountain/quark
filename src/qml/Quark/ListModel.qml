import QtQuick 2.6

import com.cutehacks.gel 1.0
import "jsonpath.js" as JsonPath

JsonListModel {
    id: model
    property var path: "$"

    function addValue(value) {
        const items = JSONPath({path: model.path, json: value})[0];

        if(!Array.isArray(items)) {
            console.log('JsonListModel Error: Value from' + model.path + " is not an array: " + JSON.stringify(items));
            return;
        }
        model.clear();
        items.forEach(function(item) {
            model.add(item);
        });
    }

    Component.onCompleted: {
        addValue(backend.value);
        backend.valueChanged.connect(addValue);
    }
}
