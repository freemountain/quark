import { Transform } from "stream";
import Immutable from "immutable";
import Selector from "./Selector";
import diff from "immutablediff";
import assert from "assert";

export default class Store extends Transform {
    static of(...args) {
        return new Store(...args);
    }

    constructor(state) {
        super({
            objectMode: true
        });

        // FIXME: das hier macht iwie mucken, is aber jucking, wenn
        // auf c++ seite json patch benutzt wird, dadurch sind auch
        // die diffs atm nur auf einer ebene sinnvoll, des weiteren
        // muss en weg gefunden werden, wie neue records sinnvoll in
        // den immutable context gebracht werden
        // this.state = Immutable.fromJS(state);

        this.state = Immutable.Map(state);

        this.push(this.state.toJSON());
    }

    onResult(cb, state) {
        assert(state instanceof Immutable.Map, "unexpected state");

        const difference = diff(this.state, state).toJSON();

        if(difference.length === 0) return cb();

        // TODO: diff here
        console.error(`diff: ${JSON.stringify(difference)}`);
        this.state = state;
        this.push(this.state.toJSON());

        return cb();
    }

    _transform({ intent, payload }, enc, cb) {
        const result = intent(this.state, payload);

        if(result.then) return result.then(this.onResult.bind(this, cb)).catch(cb);

        return this.onResult(cb, result);
    }

    listen(path) {
        return this.pipe(Selector.of(path));
    }
}
