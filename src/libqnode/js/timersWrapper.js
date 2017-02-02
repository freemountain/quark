function(timers, helper) {
    var wrapper = {
        setTimeout: function setTimeout(callback, t) {
            var result = timers.setTimeout(callback, t, helper.collectArgs(arguments, 2));

            return result;
        },
        setInterval: function setInterval(callback, t) {
            var result = timers.setInterval(callback, t, helper.collectArgs(arguments, 2));

            return result;
        },
        setImmediate: function setImmediate(callback) {
            var result = timers.setTimeout(callback, 0, helper.collectArgs(arguments, 1));

            return result;
        },
        clearImmediate: function(id) {
            timers.clear(id);
        },
        clearTimeout: function(id) {
            timers.clear(id);
        },
        clearInterval: function(id) {
            timers.clear(id);
        }
    }

    return Object.freeze(wrapper);
}
