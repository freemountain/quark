import Runtime from "../Runtime";
import { expect } from "chai";
import TestUnit from "./mocks/TestUnit";
import Action from "../domain/Action";
import Trigger from "../domain/Trigger";
import Immutable from "immutable";
import Uuid from "../util/Uuid";
import sinon from "sinon";
import Internals from "../domain/Internals";
import Message from "../Message";

const triggered = Action.triggered;

class Inheritance extends TestUnit {
    static triggers = {
        props: triggered.by("test"),
        blub:  triggered.by("bla")
    };

    static props = {
        name:     "Jupp",
        age:      40,
        loggedIn: false
    };
}

describe("RuntimeTest", function() {
    before(function() {
        let counter = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid", () => "test");

        global.Date.now = () => ++counter;
    });

    after(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("extracts all methods from a class instance", function() {
        const methods = Runtime.allActions(new TestUnit());

        expect(methods.keySeq().toJS()).to.eql([
            "init",
            "message",
            "children",
            "diffs",
            "props",
            "action"
        ]);
    });

    it("extracts all triggers from an instance", function() {
        const triggers = Runtime.allTriggers(new Inheritance());

        expect(triggers.toJS()).to.eql({
            action: {
                name:     "action",
                triggers: [
                    (new Trigger("action")).toJS(),
                    (new Trigger("message", Immutable.List([() => true]))).toJS()
                ]
            },

            children: {
                name:     "children",
                triggers: [
                    (new Trigger("children")).toJS(),
                    (new Trigger("message", Immutable.List([() => true]))).toJS()
                ]
            },

            diffs: {
                name:     "diffs",
                triggers: [
                    (new Trigger("diffs")).toJS(),
                    (new Trigger("message", Immutable.List([() => true]))).toJS()
                ]
            },

            init: {
                name:     "init",
                triggers: [
                    (new Trigger("init")).toJS(),
                    (new Trigger("message", Immutable.List([() => true]))).toJS()
                ]
            },

            props: {
                name:     "props",
                triggers: [
                    (new Trigger("message.done")).toJS(),
                    (new Trigger("props")).toJS(),
                    (new Trigger("test")).toJS()
                ]
            },

            blub: {
                name:     "blub",
                triggers: [
                    (new Trigger("blub")).toJS(),
                    (new Trigger("bla")).toJS()
                ]
            }
        });
    });

    it("creates an extended Runtime and checks the actions", function() {
        const unit = new TestUnit();

        expect(unit.actions()).to.eql({
            message: {
                unit:   "TestUnit",
                name:   "message",
                before: [{
                    emits:  "init",
                    guards: 1,
                    params: [],
                    delay:  0
                }, {
                    emits:  "action",
                    guards: 1,
                    params: [],
                    delay:  0
                }, {
                    emits:  "children",
                    guards: 1,
                    params: [],
                    delay:  0
                }, {
                    emits:  "diffs",
                    guards: 1,
                    params: [],
                    delay:  0
                }],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [{
                    emits:  "props",
                    guards: 0,
                    params: [],
                    delay:  0
                }]
            },

            action: {
                unit:     "TestUnit",
                name:     "action",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     []
            },

            children: {
                unit:     "TestUnit",
                name:     "children",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     []
            },

            diffs: {
                unit:     "TestUnit",
                name:     "diffs",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     []
            },

            init: {
                unit:     "TestUnit",
                name:     "init",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     []
            },

            props: {
                unit:     "TestUnit",
                name:     "props",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     []
            }
        });
    });

    it("it calls some methods", function() {
        const unit = new Inheritance();

        expect(unit.state()).to.eql(null);

        const data = Immutable.Map({
            name:  "jupp",
            _unit: new Internals({
                id:          "blub",
                name:        "Inheritance",
                description: unit.__actions
            })
        });

        const message  = new Message("/actions/init", [data]);
        const data2    = data.update("_unit", internals => internals.messageReceived(message));
        const cursor   = new unit.__Cursor(data2);
        const payload  = Immutable.List.of(data2);
        const message2 = message.set("payload", payload);

        expect(message2.get("payload").first()).to.equal(payload.first());

        return unit.message.call(cursor, message2).then(x => {
            expect(x.filter((_, key) => key !== "_unit").toJS()).to.eql({
                name: "jupp"
            });

            expect(x.get("_unit").get("traces").toJS()).to.eql([{
                end:      null,
                error:    null,
                guards:   0,
                start:    8,
                triggers: true,
                params:   [{
                    _unit: {
                        action:      null,
                        description: unit.description.toJS(),
                        children:    {},
                        diffs:       [],
                        errors:      [],
                        history:     [],
                        id:          "blub",
                        revision:    0,
                        current:     0,
                        traces:      [],
                        name:        "Inheritance"
                    },
                    name: "jupp"
                }],
                traces: [],
                name:   "Inheritance::Message</actions/init>"
            }]);
        });
    });

    it("creates an inherited runtime and checks the initial cursor", function() {
        const unit = new Inheritance();

        expect(unit.state()).to.eql(null);

        return unit.ready()
            .then(() => {
                expect(unit.state()).to.eql({
                    _unit: {
                        revision: 1,
                        name:     "Inheritance",
                        children: {},
                        errors:   []
                    },
                    name:     "Jupp",
                    age:      40,
                    loggedIn: false
                });

                expect(unit.traces().toJS()).to.eql([{
                    end:      11,
                    error:    null,
                    guards:   0,
                    start:    10,
                    triggers: true,
                    params:   [{
                        _unit: {
                            action:      null,
                            description: unit.description.toJS(),
                            children:    {},
                            diffs:       [],
                            errors:      [],
                            history:     [],
                            id:          "test",
                            revision:    0,
                            current:     0,
                            traces:      [],
                            name:        "Inheritance"
                        },
                        age:      40,
                        name:     "Jupp",
                        loggedIn: false
                    }],
                    traces: [],
                    name:   "Inheritance::Message</actions/init>"
                }]);
            });
    });
});
