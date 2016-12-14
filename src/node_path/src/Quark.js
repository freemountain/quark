import Gluon from "./Gluon";
import assert from "assert";
import Unit from "./Unit";
import map from "through2-map";
import patch from "Immutablepatch";
import Immutable from "immutable";

export default class Quark {
    static Unit = Unit;

    static of(...args) {
        return new Quark(...args);
    }

    constructor(app) {
        const message = `Your app has to be a class that extends Unit, but you gave me ${app}`;

        assert(app instanceof Function, `Your app has to be a class that extends Unit, but you gave me ${app}`);

        this.app   = new app();
        this.state = this.app.state();
        this.view  = Gluon.of(this.state.get("qml"));

        assert(this.app instanceof Unit, message);

        this.view
            .pipe(this.app.on("error", this.onError.bind(this)))
            .pipe(map.obj(this.update.bind(this)).on("error", this.onError.bind(this)))
            .pipe(this.view)
            .on("error", this.onError.bind(this));
    }

    onError(e) {
        throw e;
    }

    update(diffs) {
        this.state = patch(this.state, Immutable.fromJS(diffs));

        console.error("update");

        return this.state.toJS();
    }
}
