import { Duplex, Transform } from "stream";
import Stream from "stream";
import JSONStream from "jsonstream2";
import Filter from "through2-filter";
import Mapper from "through2-map";

// hier das is wg qt seite komisch
const JSONStringifier = () => new Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
        cb(null, `${JSON.stringify(chunk)}\n`);
    }
});

export default class Gluon extends Duplex {
    static opts = {
        objectMode: true
    };

    static of(...args) {
        return new Gluon(...args);
    }

    static Output(type) {
        const out = new Stream(Gluon.opts);

        out
            .pipe(Mapper(Gluon.opts, payload => ({ type, payload })))
            .pipe(JSONStringifier())
            .pipe(global.process.stdout);

        return out;
    }

    constructor(qmlPath) {
        super({
            objectMode: true
        });

        this.initialLoad = true;
        this.qmlPath     = qmlPath;
        this.valueOut    = Gluon.Output("value");
        this.actionOut   = Gluon.Output("action");
        this.actions     = global.process.stdin
            .pipe(JSONStream.parse())
            .pipe(Filter(Gluon.opts, msg => msg.type === "action"))
            .pipe(Mapper(Gluon.opts, msg => msg.payload));

        this.actions.on("data", data => this.push(data));
    }

    // sowohl load als auch start/kill sollten später als io
    // über das plugin system gelöst werden iwie ?
    load(url) {
        this.initialLoad = false;

        this.actionOut.emit("data", {
            type:    "loadQml",
            payload: {
                url
            }
        });

        return url;
    }

    trim(path) {
        return path
            .slice(1)
            .replace(/\//g, "\\");
    }

    start(process) {
        this.actionOut.emit("data", {
            type:    "startProcess",
            payload: this.trim(process)
        });

        return process;
    }

    kill(process) {
        this.actionOut.emit("data", {
            type:    "killProcess",
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
