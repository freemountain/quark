"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _stream = require("stream");

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _Selector = require("./Selector");

var _Selector2 = _interopRequireDefault(_Selector);

var _immutablediff = require("immutablediff");

var _immutablediff2 = _interopRequireDefault(_immutablediff);

var _assert = require("assert");

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Store extends _stream.Transform {
    static of(...args) {
        return new Store(...args);
    }

    constructor(state) {
        super({
            objectMode: true
        });

        // FIXME: das hier macht iwie mucken, is aber jucking, wenn
        // auf c++ seite json patch benutzt wird, dadurch sind auch
        // die diffs atm nur auf einer ebene sinnvoll, des weiteren
        // muss en weg gefunden werden, wie neue records sinnvoll in
        // den immutable context gebracht werden
        // this.state = Immutable.fromJS(state);

        this.state = _immutable2.default.Map(state);

        this.push(this.state.toJSON());
    }

    onResult(cb, state) {
        (0, _assert2.default)(state instanceof _immutable2.default.Map, "unexpected state");

        const difference = (0, _immutablediff2.default)(this.state, state).toJSON();

        if (difference.length === 0) return cb();

        // TODO: diff here
        console.error(`diff: ${ (0, _stringify2.default)(difference) }`);
        this.state = state;
        this.push(this.state.toJSON());

        return cb();
    }

    _transform({ intent, payload }, enc, cb) {
        const result = intent(this.state, payload);

        if (result.then) return result.then(this.onResult.bind(this, cb)).catch(cb);

        return this.onResult(cb, result);
    }

    listen(path) {
        return this.pipe(_Selector2.default.of(path));
    }
}
exports.default = Store;

//# sourceMappingURL=Store.js.map