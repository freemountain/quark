const stream    = require("stream");
const Transform = stream.Transform;
const assert    = require("assert");
const Immutable = require("immutable");

module.exports = class Store extends Transform {
    static of(...args) {
        return new Store(...args);
    }

    constructor(state) {
	    super({
		    objectMode: true
        });

        this.state = Immutable.Map(state);
        this.push(state);
    }

    onResult(cb, state) {
        assert(state instanceof Immutable.Map, "unexpected state");

        if(this.state === state) return cb();

        // TODO: diff here
        this.state = state;
    	this.push(this.state.toJS());
	    cb();
    }

    _transform({ intent, payload }, enc, cb) {
        const result = intent(this.state, payload);

	    if(result.then) return result.then(this.onResult.bind(this, cb)).catch(cb);
         
	    this.onResult(cb, result);
    }
}
