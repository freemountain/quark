import Trace from "../Trace";
import { expect } from "chai";
import Immutable from "immutable";

describe("TraceTest", function() {
    before(function() {
        let counter = 0;

        this.now = global.Date.now;

        global.Date.now = () => ++counter;
    });

    after(function() {
        global.Date.now = this.now;
    });

    it("creates a trace with subtraces", function() { // eslint-disable-line
        const trace = new Trace({
            name: "test"
        }, "Unit");

        expect(trace.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [],
            guards:   0
        });

        expect(trace.isConsistent()).to.equal(false);
        expect(trace.toString()).to.equal("!Unit::test()@01:00:00 GMT+0100 (CET)");

        const trace2  = trace.trace({
            name:   "sub1",
            params: Immutable.List([1, 2]),
            guards: 1
        }, "Blub");

        expect(trace2.toJS()).to.eql({
            start:    2,
            name:     "Blub::sub1",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [1, 2],
            guards:   1
        });

        expect(trace2.isConsistent()).to.equal(false);

        expect(trace.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: false,
                error:    null,
                end:      null,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }],
            guards: 0
        });

        const trace3 = trace2.triggered();

        expect(trace3.isConsistent()).to.equal(false);
        expect(trace3.toJS()).to.eql({
            start:    2,
            name:     "Blub::sub1",
            triggers: true,
            error:    null,
            end:      null,
            traces:   [],
            params:   [1, 2],
            guards:   1
        });

        expect(trace.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      null,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }],
            guards: 0
        });

        const trace4 = trace3.ended();

        expect(trace4.isConsistent()).to.equal(false);
        expect(trace4.traces[0].isConsistent()).to.equal(false);
        expect(trace4.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }],
            guards: 0
        });

        const trace5 = trace4.trace({
            name:   "sub2",
            params: Immutable.List(["huhu"]),
            guards: 2
        }, "Bla");

        expect(trace5.isConsistent()).to.equal(false);
        expect(trace5.toJS()).to.eql({
            start:    4,
            name:     "Bla::sub2",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   ["huhu"],
            guards:   2
        });

        expect(trace4.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    null,
                end:      null,
                traces:   [],
                params:   ["huhu"],
                guards:   2
            }],
            guards: 0
        });

        const trace6 = trace5.trace({
            name:   "sub3",
            params: Immutable.List([true]),
            guards: 3
        }, "Bli");

        expect(trace6.isConsistent()).to.equal(false);
        expect(trace6.toJS()).to.eql({
            start:    5,
            name:     "Bli::sub3",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [true],
            guards:   3
        });

        expect(trace4.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    null,
                end:      null,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: false,
                    error:    null,
                    end:      null,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });

        const trace7 = trace6.triggered();

        expect(trace7.isConsistent()).to.equal(false);
        expect(trace7.toJS()).to.eql({
            start:    5,
            name:     "Bli::sub3",
            triggers: true,
            error:    null,
            end:      null,
            traces:   [],
            params:   [true],
            guards:   3
        });

        expect(trace4.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    null,
                end:      null,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      null,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });

        const trace8 = trace7.ended();

        expect(trace8.isConsistent()).to.equal(false);
        expect(trace8.toJS()).to.eql({
            start:    4,
            name:     "Bla::sub2",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [{
                start:    5,
                name:     "Bli::sub3",
                triggers: true,
                error:    null,
                end:      6,
                traces:   [],
                params:   [true],
                guards:   3
            }],
            params: ["huhu"],
            guards: 2
        });

        expect(trace4.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    null,
                end:      null,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      6,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });

        const trace9 = trace8.errored(new Error("huhu"));

        expect(trace9.isConsistent()).to.equal(false);
        expect(trace9.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    new Error("huhu"),
                end:      7,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      6,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });

        expect(trace4.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    new Error("huhu"),
                end:      7,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      6,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });
        expect(trace9).to.equal(trace4);

        const trace10 = trace9.triggered();

        expect(trace.isConsistent()).to.equal(false);
        expect(trace10.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: true,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    new Error("huhu"),
                end:      7,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      6,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });

        const trace11 = trace10.ended();

        expect(trace11.toJS()).to.eql({
            start:    1,
            name:     "Unit::test",
            triggers: true,
            error:    null,
            end:      8,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Blub::sub1",
                triggers: true,
                error:    null,
                end:      3,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }, {
                start:    4,
                name:     "Bla::sub2",
                triggers: false,
                error:    new Error("huhu"),
                end:      7,
                traces:   [{
                    start:    5,
                    name:     "Bli::sub3",
                    triggers: true,
                    error:    null,
                    end:      6,
                    traces:   [],
                    params:   [true],
                    guards:   3
                }],
                params: ["huhu"],
                guards: 2
            }],
            guards: 0
        });

        expect(trace.toString()).to.equal("                !Unit::test()@01:00:00 GMT+0100 (CET)\n               /                                     \\\n  Blub::sub1(Number, Number)                 !Bla::sub2(String)\n                                                      |\n                                             Bli::sub3(Boolean)");

        expect(trace11.__isSelfConsistent()).to.equal(true);
        expect(trace11.__isParentConsistent()).to.equal(true);
        expect(trace11.isConsistent()).to.equal(true);
    });
});
