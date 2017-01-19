import Runtime from "../Runtime";
import { expect } from "chai";
import TestUnit from "./mocks/TestUnit";
import Action from "../domain/Action";
import Trigger from "../domain/Trigger";
import Immutable from "immutable";
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

        const message = new Message("/actions/init", [{
            name: "jupp"
        }]);

        return unit.message.call(new unit.__Cursor(message.get("payload").set("_unit", new Internals({
            id:          "blub",
            name:        "Inheritance",
            actions:     Immutable.fromJS([[]]),
            action:      message,
            description: unit.__actions
        }))), message).then(x => {
            expect(x.filter((_, key) => key !== "_unit").toJS()).to.eql([{
                name: "jupp"
            }]);

            expect(x.get("_unit").get("actions").toJS()).to.eql([[{}]]);
        });
    });


    it("creates an inerhited runtime and checks the initial cursor", function() {
        const unit = new Inheritance();

        expect(unit.state()).to.eql(null);

        return unit.ready()
            .then(() => {
                expect(unit.state()).to.eql({
                    _unit: {
                        revision: 1,
                        errors:   []
                    },
                    name:     "Jupp",
                    age:      40,
                    loggedIn: false
                });

                expect(unit.traces().toJS()).to.equal([[{
                    action:  "init",
                    payload: {
                        name:     "Jupp",
                        age:      40,
                        loggedIn: false
                    },
                    diffs: []
                }]]);
            });
    });
});
