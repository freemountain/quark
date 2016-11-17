const util          = require("util");
const Stream        = require("stream");
const StringDecoder = require("string_decoder").StringDecoder;
const Transform     = Stream.Transform;
const Duplex        = Stream.Duplex;

const set = (obj, key, x) => { 
    obj[key] = x;

    return obj;
}

const MessageTransformer = type => new Transform({
    objectMode: true,

    transform(payload, enc, cb) {
       cb(null, { type, payload });
    }
});

const MessageFilter = type => new Transform({
    objectMode: true,

    transform(msg, enc, cb) {
       return msg.type === type ? cb(null, msg.payload) : cb();
    }
});

const JSONStringifier = () => new Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
       cb(null, `${JSON.stringify(chunk)}\n`);
    }
});

const JSONParser = () => new Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
       cb(null, JSON.parse(chunk));
    }
});

const LineSplitter = () => {
    const decoder = new StringDecoder("utf8");

    return new Transform({
        transform(chunk, encoding, cb) {
            decoder
                .write(chunk)
                .split("\n")
                .forEach(line => this.push(line));

            cb();
        }
    }).setEncoding("utf8");
};

const Output = type => {
    const out = new Stream({ objectMode: true });

    out
        .pipe(MessageTransformer(type))
        .pipe(JSONStringifier())
        .pipe(process.stdout);

    return out;
};

module.exports = class Gluon extends Duplex {
    static of(...args) {
        return new Gluon(...args);
    }

    constructor(qmlPath) {
        super({
            objectMode: true    
        });

        this.initialLoad = true;
        this.qmlPath     = qmlPath;
        this.valueOut    = Output("value");
        this.actionOut   = Output("action");
        this.actions     = process.stdin
            .pipe(LineSplitter())
            .pipe(JSONParser())
            .pipe(MessageFilter("action"));

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

    start(process) {
        this.actionOut.emit("data", {
            type:    "startProcess",
            // hier die regexp weg
            payload: process.slice(1).replace(new RegExp("/", "g"),"\\")
        });

        return process;
    }

    kill(process) {
        this.actionOut.emit("data", {
            type:    "killProcess",
            payload: process
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
