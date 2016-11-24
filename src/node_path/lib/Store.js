"use strict";

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const stream = require("stream");
const Transform = stream.Transform;
const assert = require("assert");
const Immutable = require("immutable");
const Selector = require("./Selector");
const diff = require("immutablediff");

module.exports = class Store extends Transform {
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

        this.state = Immutable.Map(state);

        this.push(this.state.toJSON());
    }

    onResult(cb, state) {
        assert(state instanceof Immutable.Map, "unexpected state");

        const difference = diff(this.state, state).toJSON();

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
        return this.pipe(Selector.of(path));
    }
};

//# sourceMappingURL=Store.js.map