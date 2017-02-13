import Gluon from "./Gluon";
import assert from "assert";
import Unit from "./Unit";
import map from "through2-map";
import patch from "Immutablepatch";
import { fromJS } from "immutable";
import Property from "./domain/Property";
import DeclaredAction from "./domain/DeclaredAction";
import Message from "./Message";
import type { Map } from "immutable";
import type { Diffs } from "./domain/Cursor";
import util from "util";
import Runtime from "./Runtime";

export default class Quark {
    view:  Gluon;         // eslint-disable-line
    state: Map<string, *>;
    app:   Unit;          // eslint-disable-line

    static triggered = DeclaredAction.triggered;
    static derive    = Property.derive;   // eslint-disable-line
    static Unit      = Unit;              // eslint-disable-line

    static of(...args: Array<*>): Quark {
        return new Quark(...args);
    }

    constructor(app: Class<Runtime>) { // eslint-disable-line
        const message = `Your app has to be a class that extends Unit, but you gave me ${JSON.stringify(app)}`;

        assert(app instanceof Function, `Your app has to be a class that extends Unit, but you gave me '${JSON.stringify(app)}' instead.`);

        this.app   = new app();
        this.state = this.app.state();
        this.view  = Gluon.of(this.state.get("qml"));

        assert(this.app instanceof Unit, message);

        this.view
            .pipe(map.obj(x => {
                if(x.type === "diffs") console.error("new diffs", x);

                return x;
            }))
            .pipe(this.app.on("error", this.onError.bind(this)))
            .pipe(map.obj(this.update.bind(this)).on("error", this.onError.bind(this)))
            .pipe(this.view)
            .on("error", this.onError.bind(this));
    }

    onError(e: Error): void {
        throw e;
    }

    update(data: Message) {
        this.updateWindows(data.payload);
        this.updateProcesses(data.payload);

        this.state = patch(this.state, fromJS(data.payload));

        console.error("update ", util.inspect(this.app.toJS(), { depth: null }));
        return this.state.toJS();
    }

    updateProcesses(diffs: Diffs) {
        diffs
            .filter(diff => (
                diff.path.indexOf("/processes") === 0 &&
                (diff.op === "add" || diff.op === "replace")
            ))
            .toJS()
            .forEach(({ value }) => value.forEach(({ path }) => this.view.start(path)));

        diffs
            .filter(diff => (
                diff.path.indexOf("/processes") === 0 &&
                (diff.op === "add" || diff.op === "replace")
            ))
            .toJS()
            .forEach(({ op, value }) => console.error("processes", op, value));
    }

    updateWindows(diffs: Diffs) {
        diffs
            .filter(diff => (
                diff.path === "/windows" &&
                diff.op === "add"
            ))
            .toJS()
            .forEach(({ value }) => value.forEach(({ qml }) => this.view.load(qml)));

        diffs
            .filter(diff => (
                diff.path.indexOf("/windows/") === 0 &&
                diff.op === "add"
            ))
            .toJS()
            .forEach(({ value }) => this.view.load(value.qml));

        diffs
            .filter(diff => (
                diff.path.indexOf("/windows") === 0 &&
                diff.op === "replace"
            ))
            .toJS()
            .forEach(({ value }) => value.forEach(({ qml }) => this.view.load(qml)));

        diffs
            .filter(diff => (
                diff.path.indexOf("/windows") === 0 &&
                diff.op === "remove"
            ))
            .toJS()
        .forEach(({ path }) => this.view.close(this.state.get("windows").get(parseInt(path.split("/").pop(), 10)).get("qml")));
    }
}
