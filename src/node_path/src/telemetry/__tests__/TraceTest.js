import Trace from "../Trace";
import { expect } from "chai";
import Cursor from "../../domain/Cursor";
import Internals from "../../domain/Internals";
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
        const data = Immutable.fromJS({
            _unit: new Internals({
                name:        "Unit",
                description: Immutable.Map()
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);
        const trace      = new Trace({
            name: "test"
        }, cursor);

        expect(trace.toJS()).to.eql({
            start:    1,
            name:     "Unit[test]",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [],
            guards:   0
        });

        expect(() => trace.trace.end()).to.throw("AssertionError: Can't end a trace, when not started.");

        const cursor2 = cursor.update(internals => internals.set("name", "Blub"));
        const trace2  = trace.trace({
            name:   "sub1",
            params: Immutable.List([1, 2]),
            guards: 1
        }, cursor2);

        expect(trace2.toJS()).to.eql({
            start:    2,
            name:     "Unit[sub1]",
            triggers: false,
            error:    null,
            end:      null,
            traces:   [],
            params:   [1, 2],
            guards:   1
        });

        expect(trace.toJS()).to.eql({
            start:    1,
            name:     "Unit[test]",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Unit[sub1]",
                triggers: false,
                error:    null,
                end:      null,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }],
            guards: 0
        });

        const trace3 = trace2.trace.triggered();

        expect(trace3.toJS()).to.eql({
            start:    2,
            name:     "Unit[sub1]",
            triggers: true,
            error:    null,
            end:      null,
            traces:   [],
            params:   [1, 2],
            guards:   1
        });

        expect(trace.toJS()).to.eql({
            start:    1,
            name:     "Unit[test]",
            triggers: false,
            error:    null,
            end:      null,
            params:   [],
            traces:   [{
                start:    2,
                name:     "Unit[sub1]",
                triggers: true,
                error:    null,
                end:      null,
                traces:   [],
                params:   [1, 2],
                guards:   1
            }],
            guards: 0
        });

        const trace4 = trace3.trace.end();
        const trace5 = trace4.trace();
        const trace6 = trace5.trace();
        const trace7 = trace6.trace();
        const trace8 = trace7.trace.end();
        const trace9 = trace8.error();

        expect(trace9.isConsistent()).to.equal(true);
    });
});
