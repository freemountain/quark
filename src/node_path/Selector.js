const stream    = require("stream");
const Transform = stream.Transform;

module.exports = class Selector extends Transform {
    static of(...args) {
        return new Selector(...args);
    }

    constructor(path) {
        super({
            objectMode: true    
        });

        this.keys      = path.split(".");
        this.selection = null;
    }

    _transform(data, enc, cb) {
        const selection = this.keys.reduce((slice, key) => slice[key], data);

        return selection !== this.selection ? cb(null, selection) : cb();
    }
}
