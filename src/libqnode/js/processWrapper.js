function(qProcess, helper, ctx) {
    var wrapper = {
        nextTick: function nextTick() {
            var result = qProcess.nextTick(arguments[0], helper.collectArgs(arguments, 1));
            return helper.throwError(result)
        },
        send: function send(msg) {
            return helper.throwError(qProcess.send(msg));
        },
        cwd: function cwd() {
            return ctx.getCWD();
        }
    }

    return Object.freeze(wrapper);
}
