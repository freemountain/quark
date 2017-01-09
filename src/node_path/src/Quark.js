import Gluon from "./Gluon";
import assert from "assert";
import Unit from "./Unit";
import map from "through2-map";
import patch from "Immutablepatch";
import Immutable from "immutable";
import Property from "./domain/Property";
import Trigger from "./domain/Trigger";

export default class Quark {
    static triggered = Trigger.triggered;
    static derive    = Property.derive;   // eslint-disable-line
    static Unit      = Unit;              // eslint-disable-line

    static of(...args) {
        return new Quark(...args);
    }

    constructor(app) {
        const message = `Your app has to be a class that extends Unit, but you gave me ${JSON.stringify(app)}`;

        assert(app instanceof Function, `Your app has to be a class that extends Unit, but you gave me '${JSON.stringify(app)}' instead.`);

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

    update(data) {
        this.updateWindows(data.payload);
        this.updateProcesses(data.payload);

        this.state = patch(this.state, Immutable.fromJS(data.payload));

        console.error("update ", this.app.toJS());
        return this.state.toJS();
    }

    updateProcesses(diffs) {
        diffs
            .filter(diff => (
                diff.path.indexOf("/processes") === 0 &&
                (diff.op === "add" || diff.op === "replace")
            ))
            .forEach(({ value }) => value.forEach(({ path }) => this.view.start(path)));

        diffs
            .filter(diff => (
                diff.path.indexOf("/processes") === 0 &&
                (diff.op === "add" || diff.op === "replace")
            ))
            .forEach(({ op, value }) => console.error("processes", op, value));
    }

    updateWindows(diffs) {
        diffs
            .filter(diff => (
                diff.path.indexOf("/windows") === 0 &&
                diff.op === "add"
            ))
            .forEach(({ value }) => this.view.load(value.qml));

        diffs
            .filter(diff => (
                diff.path.indexOf("/windows") === 0 &&
                diff.op === "replace"
            ))
        .forEach(({ value }) => value.forEach(({ qml }) => this.view.load(qml)));
    }
}
