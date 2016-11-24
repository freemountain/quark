"use strict";

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const stream = require("stream");
const Duplex = stream.Duplex;
const GCD = require("./GCD");
const Store = require("./Store");
const Gluon = require("./Gluon");

module.exports = class Quark extends Duplex {
    static of(...args) {
        return new Quark(...args);
    }

    constructor({ initialState: state, intents, qml, mappings }) {
        super({
            objectMode: true
        });

        // TODO options parsen und hinzufügen
        this.store = Store.of((0, _assign2.default)({ qml, processes: [] }, state || {}));
        this.gcd = GCD.of(intents || {}, mappings);
        this.view = Gluon.of(qml);
        this.qml = qml;
        this.timeout = 0;
        this.buffer = [];

        this.store.on("data", this.buffer.push.bind(this.buffer));
        this.view.pipe(this.gcd).pipe(this.store).pipe(this.view);
    }

    after(timeout) {
        this.timeout = timeout;

        return this;
    }

    trigger(type, payload) {
        setTimeout(() => this.write({ type, payload }), this.timeout);

        return this.after(0);
    }

    listen(path) {
        return this.store.listen(path);
    }

    write(...args) {
        super.write(...args);

        return this;
    }

    _write(data, enc, cb) {
        this.gcd.write(data);
        cb();
    }

    _read() {
        // eslint-disable-line
        if (this.buffer.length === 0) return setTimeout(this._read.bind(this), 17); // eslint-disable-line

        this.buffer.forEach(this.push.bind(this));
        this.buffer.length = 0;
    }
};

//# sourceMappingURL=Quark.js.map