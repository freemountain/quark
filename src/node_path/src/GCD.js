import { Transform } from "stream";
import assert from "assert";
import set from "lodash.set";
import Intent from "./Intent";

export default class GCD extends Transform {
    static of(...args) {
        return new GCD(...args);
    }

    constructor(intents = {}, mappings = {}) {
        super({
            objectMode: true
        });

        this.intents  = intents;
        this.mappings = Object.assign(Object.keys(intents)
            .reduce((dest, key) => set(dest, this.toAction(key), key), {}), mappings);

        this.mappingsString = JSON.stringify(this.mappings);
    }

    toAction(key) {
        return key
            .slice(2, 3)
            .toLowerCase()
            .concat(key.slice(3));
    }

    _transform(data, enc, cb) {
        assert(data && typeof data.type === "string", `Your action is in the wrong format. Expected an object with key type, but got '${JSON.stringify(data)}' of type ${typeof data}.`);

        const key = this.mappings[data.type];

        assert(typeof key === "string", `There is exists no mapping for '${data.type}' in ${this.mappingsString}.`);

        const intent = this.intents[key];

        assert(typeof intent === "function", `No intent found for '${data.type}' -> '${key}' in intents [${Object.keys(this.intents)}].`);

        this.push(Intent.of(intent, data.payload, this));
        cb();
    }
}
