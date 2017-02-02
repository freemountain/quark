(function() {
    return {
        f: function() {
            var utils = {};

            utils.parseStack = function(stack) {
                return stack
                    .split('\n')
                    .map(function(line) {
                        return line.split(':');
                    })
                ;
            }

            utils.greet = function() {
                console.log('hohoho');
            }

            return utils;
        }
    };
})()
