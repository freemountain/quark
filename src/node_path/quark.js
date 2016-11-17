const stream = require("stream");
const Duplex = stream.Duplex;
const GCD    = require("./GCD");
const Store  = require("./Store");
const View   = require("./Gluon");

module.exports = class Quark extends Duplex {
    static of(...args) {
        return new Quark(...args);
    }
 
    constructor({ initialState: state, intents, qml }) {
        super({
            objectMode: true
        });

        this.store = Store.of(Object.assign({ qml }, state || {}));
        this.gcd   = GCD.of(intents || {});
        this.view  = View.of(qml);
        this.qml   = qml;

        this.store.on("data", this.push.bind(this));
        this.view
     	    .pipe(this.gcd)
		    .pipe(this.store)
		    .pipe(this.view);
    }

    trigger(type, payload) {
        this.write({ type, payload });
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
