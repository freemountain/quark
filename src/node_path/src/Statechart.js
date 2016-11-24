const assign = require("lodash.assign");

export default class Statechart {
    static of(...args) {
        return new Statechart(...args);
    }

    constructor(description) {
        return assign(this, description);
    }
}
