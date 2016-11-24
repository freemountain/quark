"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _stream = require("stream");

var _stream2 = _interopRequireDefault(_stream);

var _jsonstream = require("jsonstream2");

var _jsonstream2 = _interopRequireDefault(_jsonstream);

var _through2Filter = require("through2-filter");

var _through2Filter2 = _interopRequireDefault(_through2Filter);

var _through2Map = require("through2-map");

var _through2Map2 = _interopRequireDefault(_through2Map);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// hier das is wg qt seite komisch
const JSONStringifier = () => new _stream.Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
        cb(null, `${ (0, _stringify2.default)(chunk) }\n`);
    }
});

class Gluon extends _stream.Duplex {

    static of(...args) {
        return new Gluon(...args);
    }

    static Output(type) {
        const out = new _stream2.default(Gluon.opts);

        out.pipe((0, _through2Map2.default)(Gluon.opts, payload => ({ type, payload }))).pipe(JSONStringifier()).pipe(global.process.stdout);

        return out;
    }

    constructor(qmlPath) {
        super({
            objectMode: true
        });

        this.initialLoad = true;
        this.qmlPath = qmlPath;
        this.valueOut = Gluon.Output("value");
        this.actionOut = Gluon.Output("action");
        this.actions = global.process.stdin.pipe(_jsonstream2.default.parse()).pipe((0, _through2Filter2.default)(Gluon.opts, msg => msg.type === "action")).pipe((0, _through2Map2.default)(Gluon.opts, msg => msg.payload));

        this.actions.on("data", data => this.push(data));
    }

    // sowohl load als auch start/kill sollten später als io
    // über das plugin system gelöst werden iwie ?
    load(url) {
        this.initialLoad = false;

        this.actionOut.emit("data", {
            type: "loadQml",
            payload: {
                url
            }
        });

        return url;
    }

    trim(path) {
        return path.slice(1).replace(/\//g, "\\");
    }

    start(process) {
        this.actionOut.emit("data", {
            type: "startProcess",
            payload: this.trim(process)
        });

        return process;
    }

    kill(process) {
        this.actionOut.emit("data", {
            type: "killProcess",
            payload: this.trim(process)
        });

        return process;
    }

    _write(data, enc, next) {
        this.valueOut.emit("data", data);

        this.qmlPath = this.initialLoad && this.qmlPath ? this.load(this.qmlPath) : this.qmlPath;
        this.qmlPath = !this.initialLoad && data.qml && data.qml !== this.qmlPath ? this.load(data.qml) : this.qmlPath;
        next();
    }

    _read() {}
}
exports.default = Gluon;
Gluon.opts = {
    objectMode: true
};

//# sourceMappingURL=Gluon.js.map