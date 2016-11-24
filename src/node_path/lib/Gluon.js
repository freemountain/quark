"use strict";

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Stream = require("stream");
const Transform = Stream.Transform;
const Duplex = Stream.Duplex;
const JSONStream = require("jsonstream2");
const Filter = require("through2-filter");
const Mapper = require("through2-map");

// hier das is wg qt seite komisch
const JSONStringifier = () => new Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
        cb(null, `${ (0, _stringify2.default)(chunk) }\n`);
    }
});

class Gluon extends Duplex {
    static of(...args) {
        return new Gluon(...args);
    }

    static Output(type) {
        const out = new Stream(Gluon.opts);

        out.pipe(Mapper(Gluon.opts, payload => ({ type, payload }))).pipe(JSONStringifier()).pipe(global.process.stdout);

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
        this.actions = global.process.stdin.pipe(JSONStream.parse()).pipe(Filter(Gluon.opts, msg => msg.type === "action")).pipe(Mapper(Gluon.opts, msg => msg.payload));

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

Gluon.opts = {
    objectMode: true
};

module.exports = Gluon;

//# sourceMappingURL=Gluon.js.map