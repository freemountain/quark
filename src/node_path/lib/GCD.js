"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _stream = require("stream");

var _assert = require("assert");

var _assert2 = _interopRequireDefault(_assert);

var _lodash = require("lodash.set");

var _lodash2 = _interopRequireDefault(_lodash);

var _Intent = require("./Intent");

var _Intent2 = _interopRequireDefault(_Intent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class GCD extends _stream.Transform {
    static of(...args) {
        return new GCD(...args);
    }

    constructor(intents = {}, mappings = {}) {
        super({
            objectMode: true
        });

        this.intents = intents;
        this.mappings = (0, _assign2.default)((0, _keys2.default)(intents).reduce((dest, key) => (0, _lodash2.default)(dest, this.toAction(key), key), {}), mappings);

        this.mappingsString = (0, _stringify2.default)(this.mappings);
    }

    toAction(key) {
        return key.slice(2, 3).toLowerCase().concat(key.slice(3));
    }

    _transform(data, enc, cb) {
        (0, _assert2.default)(data && typeof data.type === "string", `Your action is in the wrong format. Expected an object with key type, but got '${ (0, _stringify2.default)(data) }' of type ${ typeof data }.`);

        const key = this.mappings[data.type];

        (0, _assert2.default)(typeof key === "string", `There is exists no mapping for '${ data.type }' in ${ this.mappingsString }.`);

        const intent = this.intents[key];

        (0, _assert2.default)(typeof intent === "function", `No intent found for '${ data.type }' -> '${ key }' in intents [${ (0, _keys2.default)(this.intents) }].`);

        this.push(_Intent2.default.of(intent, data.payload, this));
        cb();
    }
}
exports.default = GCD;

//# sourceMappingURL=GCD.js.map