function(qConsole, helper, ctx) {
    var util = ctx.require("util");

    var timer = {};
    var wrapper = {
        log: function log() {
            qConsole.log(util.format.apply(null, arguments));
        },
        error: function error() {
            qConsole.error(util.format.apply(null, arguments));
        },
        trace: function trace(msg) {
            var e = new Error();
            var stack = e.stack;

            wrapper.error("Trace: " + msg);
            wrapper.error(stack);
        },
        dir: function dir(obj) {
            var msg = util.inspect(obj);

            wrapper.log(msg);
        },
        time: function time(label) {
            timer[label] = Date.now();
        },
        timeEnd: function timeEnd(label) {
            if(!timer[label]) {
                wrapper.log("No such label %s for console.timeEnd()", label);
                return;
            }
            var d = Date.now() - timer[label];
            delete timer[label];

            wrapper.log("%s: %sms", label, d);
        }
    };

    wrapper.info = wrapper.log;
    wrapper.warn = wrapper.error;

    return Object.freeze(wrapper);
}
