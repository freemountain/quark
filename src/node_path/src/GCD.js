import { Transform } from "stream";
import Immutable from "immutable";
import patch from "immutablepatch";

// TODO: GCD selbs soll auch ne unit sein
export default class GCD extends Transform {
    static of(...args) {
        return new GCD(...args);
    }

    constructor(app) {
        super({
            objectMode: true
        });

        this.app   = new app();
        this.state = Immutable.Map();
    }

    update(diffs) {
        this.state = patch(this.state, diffs);

        return this.state;
    }

    _transform(data, enc, cb) {
        this.app.receive(data)
            .then(this.update.bind(this))
            .then(cb)
            .catch(cb);
    }
}
