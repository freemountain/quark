Object.assign = function(target) {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  target = Object(target);
  for (var index = 1; index < arguments.length; index++) {
    var source = arguments[index];
    if (source != null) {
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
  }
  return target;
}

Error.captureStackTrace = function(targetObject) {
    var currentStack = String(new Error().stack);
    targetObject.stack = currentStack.split("\n").filter(function(line) {
        return !(line[0] === "@" && line[1] === "#");
    }).join("\n");
}
