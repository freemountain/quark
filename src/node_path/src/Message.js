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

    static assertStructure(data) {
        if(!(
            data &&
            data.headers instanceof Immutable.Map &&
            data.payload instanceof Immutable.List &&
            typeof data.resource === "string"
        )) assert(false, `Your inputdata is not a valid message, got ${JSON.stringify(data)}.`);

        return data;
    }

    constructor(resource, payload, headers = Immutable.Map()) { // eslint-disable-line
        const data = Immutable.fromJS(typeof resource === "string" ? { resource, payload, headers } : resource);

        super(data);

        if(resource instanceof Message) return Message.assertStructure(resource);

        data.headers = defaults(data.headers).to(headers);

        return Message.assertStructure(this);
    }

    isAction() {
        return this.resource.indexOf("/actions") === 0;
    }

    isDiff() {
        return !this.isAction();
    }

    willTrigger() {
        assert(false, "Message.willTrigger: implement!");

        // TODO:
        //     - Errorhandling konzeptionell über den state lösen (errors
        //     werden so früh wir möglich gecatched und dann über den cursor
        //     hochgegeben: atm macht das noch probleme
        //     - TriggerDescriptionTest fixen
        //     - Message.willTrigger implementieren + testen
        //          => hierfür muss message wahrscheinlich ne description
        //          von ner unit gesetzt bekommen im cursor, hier muss dann
        //          sichergestellt werden, dass das da ist.
    }

    path() {
        return Immutable.List(this.resource.split("/"));
    }
}
