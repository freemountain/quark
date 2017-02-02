function() {
    var helper = {};

    helper.collectArgs = function collectArgs(args, offset) {
        var argsArray = [];
        for(var i = offset || 0; i < args.length; i++) argsArray.push(args[i]);
        return argsArray;
    }

    helper.throwError = function(mayError) {
        if(mayError instanceof Error) throw mayError;

        return mayError;
    }

    return helper;
}
