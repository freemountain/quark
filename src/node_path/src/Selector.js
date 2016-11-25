import { Transform } from "stream";

export default class Selector extends Transform {
    static of(...args) {
        return new Selector(...args);
    }

    constructor(path) {
        super({
            objectMode: true
        });

        this.keys      = path.split("/");
        this.selection = null;
    }

    _transform(data, enc, cb) {
        const selection = this.keys.reduce((slice, key) => slice && slice[key], data);

        if(selection === this.selection) return cb();

        this.selection = selection;

        return cb(null, selection);
    }
}
