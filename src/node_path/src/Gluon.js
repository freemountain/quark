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

    static Output(resource) {
        const out = new Stream(Gluon.opts);

        out
            .pipe(Mapper(Gluon.opts, payload => ({ resource, payload })))
            .pipe(JSONStringifier())
            .pipe(global.process.stdout);

        return out;
    }

    constructor() {
        super({
            objectMode: true
        });

        this.initialLoad = true;
        this.valueOut    = Gluon.Output("/value");
        this.actionOut   = Gluon.Output("/action");
        this.actions     = global.process.stdin
            .pipe(JSONStream.parse())
            .pipe(Filter(Gluon.opts, msg => msg.resource === "/action"))
            .pipe(Mapper(Gluon.opts, msg => msg.payload));

        this.actions.on("data", data => {
            this.push(data);
        });
    }

    // sowohl load als auch start/kill sollten später als io
    // über das plugin system gelöst werden iwie ?
    load(url) {
        this.actionOut.emit("data", {
            type:    "loadQml",
            payload: {
                url
            }
        });

        return url;
    }

    close(url) {
        this.actionOut.emit("data", {
            type:    "closeQml",
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

        next();
    }

    _read() {}
}
