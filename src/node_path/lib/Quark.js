"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _stream = require("stream");

var _GCD = require("./GCD");

var _GCD2 = _interopRequireDefault(_GCD);

var _Store = require("./Store");

var _Store2 = _interopRequireDefault(_Store);

var _Gluon = require("./Gluon");

var _Gluon2 = _interopRequireDefault(_Gluon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Quark extends _stream.Duplex {
    static of(...args) {
        return new Quark(...args);
    }

    constructor({ initialState: state, intents, qml, mappings }) {
        super({
            objectMode: true
        });

        // TODO options parsen und hinzufügen
        this.store = _Store2.default.of((0, _assign2.default)({ qml, processes: [] }, state || {}));
        this.gcd = _GCD2.default.of(intents || {}, mappings);
        this.view = _Gluon2.default.of(qml);
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
}
exports.default = Quark;

//# sourceMappingURL=Quark.js.map