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
        assert(data && typeof data.type === "string", `Your action is in the wrong format. Expected an object with key type, but got '${data}' of type ${typeof data}.`);

        const key    = `on${this.ucfirst(data.type)}`;
        const intent = this.intents[key];

        assert(typeof intent === "function", `intent for '${key}' not found in intents ${Object.keys(this.intents)}.`);

        let timeout = 0;

        this.push({
            intent: intent.bind({
                after(time) {
                    timeout = time
                    return this;
                },

                trigger: (type, payload) => setTimeout(() => this.write({ type, payload }), timeout)
            }),
		    payload: data.payload
        });
		cb();
    }
}
