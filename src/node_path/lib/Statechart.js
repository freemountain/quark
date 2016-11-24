"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const assign = require("lodash.assign");

class Statechart {
    static of(...args) {
        return new Statechart(...args);
    }

    constructor(description) {
        return assign(this, description);
    }
}
exports.default = Statechart;

//# sourceMappingURL=Statechart.js.map