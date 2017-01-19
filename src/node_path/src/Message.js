import assert from "assert";
import Immutable from "immutable";
import defaults from "set-default-value";

export default class Message extends Immutable.Record({
    headers:  Immutable.Map(),
    payload:  Immutable.List(),
    resource: "/default"
}) {
    static is(x) {
        return x instanceof Message;
    }

    static assert(x) {
        if(!this.is(x)) assert(false, `Expected x to be an instance of message, but got ${JSON.stringify(x)}`);

        return x;
    }

    constructor(resource, payload, headers = Immutable.Map()) { // eslint-disable-line
        const data = typeof resource === "string" ? { resource, payload, headers } : resource;

        super(Immutable.fromJS(data));

        if(resource instanceof Message) return resource;

        data.headers = defaults(data.headers).to(headers);

        if(!(
            data &&
            typeof data.headers === "object" &&
            data.headers !== null &&
            data.payload instanceof Array &&
            typeof data.resource === "string"
        )) assert(false, `Your inputdata is not a valid message, got ${JSON.stringify(data)}`);
    }

    isAction() {
        return this.resource.indexOf("/actions") === 0;
    }

    isDiff() {
        return !this.isAction();
    }
}
