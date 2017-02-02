function(qUtils, helper, ctx) {
    var wrapper = {
        format: function format(msg) {
            var args = helper.collectArgs(arguments, 1);
            var tokens = String(msg).split(/(\%[sdj\%])/);

            var formated = tokens.map(function(token) {
                if(token === '%%') return '%';
                if(args.length === 0) return token;
                if(token === '%s') return String(args.shift());
                if(token === '%d') return Number(args.shift());
                if(token === '%j') return JSON.stringify(args.shift());

                return token;
            }).join('');

            while(args.length > 0) {
                var a = args.shift();
                formated = formated + ' ' + String(a);
            }

            return formated;
        },
        inherits: function inherits(ctor, superCtor) {
            ctor.super_ = superCtor
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
         },
        inspect: function inspect(object) {
            return qUtils.inspect(object);
        },
        isPrimitive: function isPrimitive(arg) {
          return arg === null ||
                 typeof arg !== 'object' && typeof arg !== 'function';
        },
        isRegExp: function isRegExp(value) {
            return (value instanceof RegExp);
        },
        isDate: function isDate(value) {
            return (Object.prototype.toString.call(value) === '[object Date]');
        },
        isString: function isString(arg) {
            return typeof arg === 'string';
        }
    }

    return Object.freeze(wrapper);
}
