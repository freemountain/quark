"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stream = require("stream");

class Selector extends _stream.Transform {
    static of(...args) {
        return new Selector(...args);
    }

    constructor(path) {
        super({
            objectMode: true
        });

        this.keys = path.split("/");
        this.selection = null;
    }

    _transform(data, enc, cb) {
        const selection = this.keys.reduce((slice, key) => slice && slice[key], data);

        if (selection === this.selection) return cb();

        this.selection = selection;

        return cb(null, selection);
    }
}
exports.default = Selector;

//# sourceMappingURL=Selector.js.map