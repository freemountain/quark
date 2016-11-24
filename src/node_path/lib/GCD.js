"use strict";

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const stream = require("stream");
const Transform = stream.Transform;
const assert = require("assert");
const set = require("lodash.set");
const Intent = require("./Intent");

module.exports = class GCD extends Transform {
    static of(...args) {
        return new GCD(...args);
    }

    constructor(intents = {}, mappings = {}) {
        super({
            objectMode: true
        });

        this.intents = intents;
        this.mappings = (0, _assign2.default)((0, _keys2.default)(intents).reduce((dest, key) => set(dest, this.toAction(key), key), {}), mappings);

        this.mappingsString = (0, _stringify2.default)(this.mappings);
    }

    toAction(key) {
        return key.slice(2, 3).toLowerCase().concat(key.slice(3));
    }

    _transform(data, enc, cb) {
        assert(data && typeof data.type === "string", `Your action is in the wrong format. Expected an object with key type, but got '${ (0, _stringify2.default)(data) }' of type ${ typeof data }.`);

        const key = this.mappings[data.type];

        assert(typeof key === "string", `There is exists no mapping for '${ data.type }' in ${ this.mappingsString }.`);

        const intent = this.intents[key];

        assert(typeof intent === "function", `No intent found for '${ data.type }' -> '${ key }' in intents [${ (0, _keys2.default)(this.intents) }].`);

        this.push(Intent.of(intent, data.payload, this));
        cb();
    }
};

//# sourceMappingURL=GCD.js.map