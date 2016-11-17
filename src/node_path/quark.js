const stream = require("stream");
const Duplex = stream.Duplex;
const GCD    = require("./GCD");
const Store  = require("./Store");
const View   = require("./Gluon");

module.exports = class Quark extends Duplex {
    static of(...args) {
        return new Quark(...args);
    }
 
    constructor({ initialState: state, intents, qml, mappings }) {
        super({
            objectMode: true
        });

        // TODO options parsen und hinzufügen
        this.store   = Store.of(Object.assign({ qml, processes: [] }, state || {}));
        this.gcd     = GCD.of(intents || {}, mappings);
        this.view    = View.of(qml);
        this.qml     = qml;
        this.timeout = 0;

        this.store.on("data", this.push.bind(this));
        this.view
     	    .pipe(this.gcd)
		    .pipe(this.store)
		    .pipe(this.view);
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

    _read() {}
}
