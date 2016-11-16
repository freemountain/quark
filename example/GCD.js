const stream    = require("stream");
const Transform = stream.Transform;
const assert    = require("assert");

module.exports = class GCD extends Transform {
    static of(...args) {
        return new GCD(...args);    
    }

    constructor(intents) {
        super({
            objectMode: true    
        });

		this.intents = intents;
    }

    ucfirst(str) {
        return str
            .slice(0, 1)
            .toUpperCase()
            .concat(str.slice(1));
    }

    _transform(data, enc, cb) {
        const intent = this.intents[`on${this.ucfirst(data.type)}`];

        assert(typeof intent === "function", `intent '${intent}' not found in intents ${Object.keys(this.intents)}.`);

        this.push({
            intent:  intent,
		    payload: data.payload
        });
		cb();
    }
}
