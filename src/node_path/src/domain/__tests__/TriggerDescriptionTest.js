import TriggerDescription from "../TriggerDescription";
import ActionDescription from "../ActionDescription";
import { expect } from "chai";
import Trigger from "../Trigger";
import Immutable from "immutable";
import sinon from "sinon";
import Cursor from "../Cursor";
import Internals from "../Internals";
import Message from "../../Message";
import Uuid from "../../util/Uuid";

describe("TriggerDescriptionTest", function() {
    beforeEach(function() {
        let id      = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid", () => ++id);

        global.Date.now = () => 0;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("creates a TriggerDescription", function() {
        const action      = new ActionDescription("Test", "blub", Immutable.List());
        const guard1      = (param1, param2, x) => x.get("value") > 1 && param1 === 1 && param2 === "huhu";
        const guard2      = sinon.stub().returns(true);
        const trigger     = new Trigger("blub", Immutable.List([guard1, guard2]), Immutable.List.of("huhu"), 10);
        const description = new TriggerDescription("blub", trigger);
        const message     = new Message("/test", []);

        expect(description.toJS()).to.eql({
            emits:  "blub",
            delay:  10,
            params: ["huhu"],
            guards: [guard1, guard2]
        });

        const data = Immutable.fromJS({
            _unit: (new Internals({
                actions:     Immutable.fromJS([[]]),
                description: Immutable.Map({
                    blub: action
                })
            })).messageReceived(message),
            value: 2
        });

        const cursor = Cursor.for(class Test {}, data.get("_unit").description);

        action.func = function(y) {
            const [a, b] = y.get("payload").toJS();

            return this.update("value", value => value + a + b.length + 2);
        };

        expect(action.func.call(new cursor(data), new Message("/blub", Immutable.List([1, "huhu"]))).get("value")).to.equal(9);

        return description.apply(new cursor(data), new Message("/blub", Immutable.List([1]))).then(x => {
            const result  = x.messageProcessed();
            const updated = data
                .set("value", 9)
                .set("_unit", Immutable.fromJS({
                    description: {
                        blub: action
                    },
                    action:   null,
                    current:  0,
                    children: {},
                    diffs:    [],
                    errors:   [],
                    history:  [],
                    id:       null,
                    name:     "Default",
                    revision: 0,
                    traces:   [{
                        id:       1,
                        parent:   null,
                        start:    0,
                        end:      0,
                        error:    null,
                        guards:   0,
                        name:     "Default::Message</test>",
                        params:   [],
                        triggers: true,
                        locked:   true,
                        traces:   [{
                            id:       2,
                            parent:   1,
                            name:     "Default::blub",
                            start:    0,
                            end:      0,
                            guards:   2,
                            triggers: true,
                            locked:   true,
                            params:   [1, "huhu"],
                            error:    null,
                            traces:   [{
                                id:       3,
                                parent:   2,
                                name:     "Default::blub<Guard1>",
                                start:    0,
                                end:      0,
                                guards:   0,
                                triggers: true,
                                params:   [1, "huhu"],
                                error:    null,
                                traces:   [],
                                locked:   true
                            }, {
                                id:       4,
                                parent:   2,
                                name:     "Default::blub<Guard2>",
                                start:    0,
                                end:      0,
                                guards:   0,
                                triggers: true,
                                params:   [1, "huhu"],
                                error:    null,
                                traces:   [],
                                locked:   true
                            }]
                        }]
                    }]
                }));

            expect(result.get("_unit").traces.first().isConsistent()).to.equal(true);
            expect(x.hasErrored).to.equal(false);
            expect(result.toJS()).to.eql(updated.toJS());
        });
    });

    it("it applies a triggerdescription with errors", function() {
        const action      = new ActionDescription("Test", "blub", Immutable.List());
        const guard1      = (param1, _, param2) => param1 && param2.name === 1;
        const trigger     = new Trigger("blub", Immutable.List([guard1]), Immutable.List(), 10);
        const description = new TriggerDescription("blub", trigger);
        const message     = new Message("/test", [1]);

        const data = Immutable.fromJS({
            _unit: (new Internals({
                actions:     Immutable.fromJS([[]]),
                description: Immutable.Map({
                    blub: action
                })
            })).messageReceived(message),
            value: 2
        });

        const cursor = Cursor.for(class Test {}, data.get("_unit").description);

        action.func = function(a) {
            return this.update("value", a.name.x);
        };

        return description.apply(new cursor(data), message).then(x => {
            const result  = x.messageProcessed();
            const updated = data.set("_unit", Immutable.fromJS({
                description: {
                    blub: action
                },
                action:   null,
                current:  0,
                children: {},
                diffs:    [],
                errors:   [],
                history:  [],
                id:       null,
                name:     "Default",
                revision: 0,
                traces:   [{
                    id:       1,
                    parent:   null,
                    start:    0,
                    end:      0,
                    error:    null,
                    guards:   0,
                    name:     "Default::Message</test>",
                    params:   [1],
                    triggers: true,
                    locked:   true,
                    traces:   [{
                        id:       2,
                        parent:   1,
                        name:     "Default::blub",
                        start:    0,
                        end:      0,
                        guards:   1,
                        triggers: false,
                        params:   [1],
                        error:    null,
                        locked:   true,
                        traces:   [{
                            id:       3,
                            parent:   2,
                            name:     "Default::blub<Guard1>",
                            start:    0,
                            end:      0,
                            guards:   0,
                            triggers: true,
                            params:   [1],
                            error:    {
                                e: new TypeError("Cannot read property 'name' of undefined")
                            },
                            traces: [],
                            locked: true
                        }]
                    }]
                }]
            }));

            expect(result.get("_unit").traces.first().isConsistent()).to.equal(true);
            expect(x.hasErrored).to.eql(true);
            expect(result.toJS()).to.eql(updated.toJS());
        });
    });
});

