// @flow

import Trace from "../Trace";
import { expect } from "chai";
import { List } from "immutable";
import Uuid from "../../util/Uuid";
import sinon from "sinon";

describe("TraceTest", function() {
    beforeEach(function() {
        let counter = 0;
        let id      = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid", () => ++id);

        global.Date.now = () => ++counter;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("checks some edge cases", function() {
        const trace = new Trace({
            name:    "test",
            trigger: "message.done"
        }, "Unit");

        const trace2 = new Trace({
            id:      "2",
            name:    "test",
            trigger: "message.done",
            params:  List.of(/ddfsf/, 2)
        });

        expect(`${trace.id + 1}`).to.equal(trace2.id);
        expect(trace.name).to.equal("Unit::test");
        expect(trace2.name).to.equal("test");
        expect(() => trace.ended().ended()).to.throw("TraceEndedError: A trace can only be ended once, but got \n\n\t\u001b[7m\u001b[90m !Unit::test() - done@\u001b[39m\u001b[27m\u001b[7m\u001b[90m2ms\u001b[39m\u001b[27m\u001b[7m\u001b[90m \u001b[39m\u001b[27m.");
        expect(trace2.toArray()).to.eql(["\u001b[7m\u001b[90m !test(RegExp, 2) - done@\u001b[39m\u001b[27m\u001b[7m\u001b[90m2ms\u001b[39m\u001b[27m\u001b[7m\u001b[90m \u001b[39m\u001b[27m"]);
    });

    it("creates a trace with subtraces", function() { // eslint-disable-line
        const trace = new Trace({
            id:      null,
            name:    "test",
            trigger: "message.done"
        }, "Unit");

        expect(trace.toJS()).to.eql({
            id:       1,
            parent:   null,
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [],
            guards:   0,
            locked:   false,
            trigger:  "done"
        });

        expect(trace.isConsistent()).to.equal(false);
        expect(trace.toString()).to.equal("\u001b[7m\u001b[90m !Unit::test() - done@\u001b[39m\u001b[27m\u001b[7m\u001b[90m1ms\u001b[39m\u001b[27m\u001b[7m\u001b[90m \u001b[39m\u001b[27m");

        const trace2  = trace.trace({
            name:   "sub1",
            params: List([1, 2]),
            guards: 1,
            parent: 1
        }, "Blub");

        expect(trace2.toJS()).to.eql({
            id:       2,
            parent:   1,
            start:    3,
            name:     "Blub::sub1",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [1, 2],
            guards:   1,
            locked:   false,
            trigger:  null
        });

        expect(trace2.isConsistent()).to.equal(false);

        const trace3 = trace2.triggered();

        expect(trace3.isConsistent()).to.equal(false);
        expect(trace3.toJS()).to.eql({
            id:       2,
            parent:   1,
            start:    3,
            name:     "Blub::sub1",
            triggers: true,
            error:    null,
            end:      null,
            traces:   [],
            params:   [1, 2],
            guards:   1,
            locked:   false,
            trigger:  null
        });

        const trace4 = trace3.ended();

        expect(trace4.isConsistent()).to.equal(true);
        expect(trace4.toJS()).to.eql({
            id:       2,
            parent:   1,
            start:    3,
            name:     "Blub::sub1",
            triggers: true,
            error:    null,
            end:      4,
            traces:   [],
            params:   [1, 2],
            guards:   1,
            locked:   false,
            trigger:  null
        });

        const trace5 = trace4.trace({
            name:   "sub2",
            params: List(["huhu"]),
            guards: 2,
            parent: 1
        }, "Bla");

        expect(trace5.isConsistent()).to.equal(false);
        expect(trace5.toJS()).to.eql({
            id:       3,
            parent:   1,
            start:    5,
            name:     "Bla::sub2",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   ["huhu"],
            guards:   2,
            locked:   false,
            trigger:  null
        });

        const trace6 = trace5.trace({
            name:   "sub3",
            params: List([true]),
            guards: 3,
            parent: 3
        }, "Bli");

        expect(trace6.isConsistent()).to.equal(false);
        expect(trace6.toJS()).to.eql({
            id:       4,
            parent:   3,
            start:    6,
            name:     "Bli::sub3",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [true],
            guards:   3,
            locked:   false,
            trigger:  null
        });

        const trace7 = trace6.triggered();

        expect(trace7.isConsistent()).to.equal(false);
        expect(trace7.toJS()).to.eql({
            id:       4,
            parent:   3,
            start:    6,
            name:     "Bli::sub3",
            triggers: true,
            error:    null,
            end:      null,
            traces:   [],
            params:   [true],
            guards:   3,
            locked:   false,
            trigger:  null
        });

        const trace8 = trace7.ended();

        expect(trace8.isConsistent()).to.equal(true);
        expect(trace8.toJS()).to.eql({
            id:       4,
            parent:   3,
            start:    6,
            name:     "Bli::sub3",
            triggers: true,
            error:    null,
            end:      7,
            traces:   [],
            params:   [true],
            guards:   3,
            locked:   false,
            trigger:  null
        });

        const trace9 = trace5
            .addSubtrace(trace8)
            .errored(new Error("huhu"));

        expect(() => trace9.lock()).to.throw("NotRootError: You can only lock the root of a trace @Bla::sub2");
        expect(trace9.isConsistent()).to.equal(true);
        expect(trace9.toJS()).to.eql({
            id:       3,
            start:    5,
            name:     "Bla::sub2",
            triggers: false,
            error:    new Error("huhu"),
            end:      8,
            parent:   1,
            traces:   [{
                id:       4,
                parent:   3,
                start:    6,
                name:     "Bli::sub3",
                triggers: true,
                error:    null,
                end:      7,
                traces:   [],
                params:   [true],
                guards:   3,
                locked:   false,
                trigger:  null
            }],
            params:  ["huhu"],
            guards:  2,
            locked:  false,
            trigger: null
        });

        const trace10 = trace
            .addSubtrace(trace4)
            .addSubtrace(trace9)
            .triggered();

        expect(trace10.isConsistent()).to.equal(false);
        expect(trace10.toJS()).to.eql({
            id:       1,
            start:    1,
            name:     "Unit::test",
            triggers: true,
            error:    null,
            end:      null,
            parent:   null,
            params:   [],
            locked:   false,
            trigger:  "done",
            traces:   [{
                id:       2,
                parent:   1,
                start:    3,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      4,
                traces:   [],
                params:   [1, 2],
                guards:   1,
                locked:   false,
                trigger:  null
            }, {
                id:       3,
                parent:   1,
                start:    5,
                name:     "Bla::sub2",
                triggers: false,
                error:    new Error("huhu"),
                end:      8,
                trigger:  null,
                traces:   [{
                    id:       4,
                    parent:   3,
                    start:    6,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      7,
                    traces:   [],
                    params:   [true],
                    guards:   3,
                    locked:   false,
                    trigger:  null
                }],
                params: ["huhu"],
                guards: 2,
                locked: false
            }],
            guards: 0
        });

        const trace11 = trace10.ended();

        expect(trace11.isConsistent()).to.equal(true);
        expect(trace11.toJS()).to.eql({
            id:       1,
            parent:   null,
            start:    1,
            name:     "Unit::test",
            triggers: true,
            error:    null,
            end:      9,
            params:   [],
            locked:   false,
            trigger:  "done",
            traces:   [{
                id:       2,
                parent:   1,
                start:    3,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      4,
                traces:   [],
                params:   [1, 2],
                guards:   1,
                locked:   false,
                trigger:  null
            }, {
                id:       3,
                parent:   1,
                start:    5,
                name:     "Bla::sub2",
                triggers: false,
                error:    new Error("huhu"),
                end:      8,
                trigger:  null,
                traces:   [{
                    id:       4,
                    parent:   3,
                    start:    6,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      7,
                    traces:   [],
                    params:   [true],
                    guards:   3,
                    locked:   false,
                    trigger:  null
                }],
                params: ["huhu"],
                guards: 2,
                locked: false
            }],
            guards: 0
        });

        expect(trace11.toString()).to.equal("                                           \u001b[7m\u001b[32m Unit::test() - done@\u001b[39m\u001b[27m\u001b[7m\u001b[32m8ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m_____\n                                          /                                                                                       \\\n  \u001b[7m\u001b[32m Blub::sub1(1, 2) - \u001b[39m\u001b[27m\u001b[7m\u001b[32m1ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m  \u001b[7m\u001b[31m #ERROR !Bla::sub2(\"huhu\") - \u001b[39m\u001b[27m\u001b[7m\u001b[31m3ms\u001b[39m\u001b[27m\u001b[7m\u001b[31m # \u001b[39m\u001b[27m\n                                                                                                                                   |\n                                                                                           \u001b[7m\u001b[32m Bli::sub3(true) - \u001b[39m\u001b[27m\u001b[7m\u001b[32m1ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m");
        expect(trace11.isConsistent()).to.equal(true);
    });
});
