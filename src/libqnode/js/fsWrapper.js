function(qFs, helper, ctx) {
    var util = ctx.require("util");

    function mapEncoding(encoding) {

    }

    function processOpts(opts) {
        var defaults = {
            encoding: null,
            flag: 'r'
        };

        if(util.isString(opts)) return {
               encoding: opts,
               flag: "r"
        };

        return Object.assign({}, defaults, opts);
    }

    function assertEncoding(opts) {
        if(!opts.encoding) throw new Error("Buffer not implemented. Need encoding!");
    }

    var wrapper = {
        readFileSync: function(file, options) {
            var opts = processOpts(options);

            assertEncoding(opts);

            var result = qFs.readFileSync(file, opts.encoding, opts.flag);
            return helper.throwError(result);
        },
        readFile: function readFile(file, options, cb) {
            if (typeof options === 'function') return readFile(file, null, options);
            if (!options) options = {};

            var opts = processOpts(options);

            assertEncoding(opts);


           qFs.readFile(file, function(errMsg, data, id) {
               var err = errMsg ? new Error(errMsg) : null;
               cb(err, data);
               qFs.clear(id);
           }, opts.encoding, opts.flag);
        },
        writeFile: function writeFile(file, data, options, cb) {
            if (typeof options === 'function') return writeFile(file, data, null, options);
            if (!options) options = {};

            var opts = processOpts(options);
            assertEncoding(opts);

            qFs.writeFile(file, data, function(errMsg, id) {
                var err = errMsg ? new Error(errMsg) : null;
                cb(err);
                qFs.clear(id);
            }, opts.encoding, opts.flag);
        },

        writeFileSync: function(file, data, options) {
            var opts = processOpts(options);

            assertEncoding(opts);
            var result = qFs.writeFileSync(file, data, opts.encoding, opts.flag);
            helper.throwError(result);
        },

        availableCodecs: function() {
            return helper.throwError(qFs.availableCodecs());
        }
    };

    return Object.freeze(wrapper);
}
