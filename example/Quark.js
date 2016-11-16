const stream    = require("stream");
const Transform = stream.Transform;
const GCD       = require("./GCD");
const Store     = require("./Store");
const View      = require("quark-shell");

module.exports = class Quark {
    static of(...args) {
        return new Quark(...args);
    }
 
    constructor({ initialState: state, intents, qml }) {
          this.store = Store.of(Object.assign({ qml }, state || {}));
          this.gcd   = GCD.of(intents || {});
          this.view  = View.of(qml);
          this.qml   = qml;

          this.view
     	    .pipe(this.gcd)
		    .pipe(this.store)
		    .pipe(this.view);
    }
}

