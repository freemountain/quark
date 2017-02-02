function(qTypedArray, helper, ctx) {
    var exports = {};
    var native = {};
    var util = ctx.require('util');

    function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

   function assertNumber(n,name) {
    if(!isNumber(n)) throw new TypeError(name + ' ' + n + ' is not a number');
   }


// Beyond this value, index getters/setters (i.e. array[0], array[1]) are so slow to
// create, and consume so much memory, that the browser appears frozen.
var MAX_ARRAY_LENGTH = 1e5;

// Approximations of internal ECMAScript conversion functions
var ECMAScript = (function() {
  // Stash a copy in case other scripts modify these
  var opts = Object.prototype.toString,
      ophop = Object.prototype.hasOwnProperty;

  return {
    // Class returns internal [[Class]] property, used to avoid cross-frame instanceof issues:
    Class: function(v) { return opts.call(v).replace(/^\[object *|\]$/g, ''); },
    HasProperty: function(o, p) { return p in o; },
    HasOwnProperty: function(o, p) { return ophop.call(o, p); },
    IsCallable: function(o) { return typeof o === 'function'; },
    ToInt32: function(v) { return v >> 0; },
    ToUint32: function(v) { return v >>> 0; }
  };
}());

var defineProp = Object.defineProperty;
var getOwnPropNames = Object.getOwnPropertyNames;

// ES5: lock down object properties
function configureProperties(obj) {
  if (getOwnPropNames && defineProp) {
    var props = getOwnPropNames(obj), i;
    for (i = 0; i < props.length; i += 1) {
      defineProp(obj, props[i], {
        value: obj[props[i]],
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
}

// ES5: Make obj[index] an alias for obj._getter(index)/obj._setter(index, value)
// for index in 0 ... obj.length
function makeArrayAccessors(obj) {
  if (!defineProp) { return; }

  if (obj.length > MAX_ARRAY_LENGTH) throw new RangeError("Array too large for polyfill");

  function makeArrayAccessor(index) {
    defineProp(obj, index, {
      'get': function() { return obj._getter(index); },
      'set': function(v) { obj._setter(index, v); },
      enumerable: true,
      configurable: false
    });
  }

  var i;
  for (i = 0; i < obj.length; i += 1) {
    makeArrayAccessor(i);
  }
}

var ArrayBuffer = function (length) {
    if (length < 0) throw new RangeError('ArrayBuffer size is not a small enough positive integer');
    this.length = length;
    this.byteLength = length;
    this._proxy = qTypedArray.createByteArrayProxy(length);

    configureProperties(this);
  };

    //
    // 5 The Typed Array View Types
    //
    var ArrayBufferView = function ArrayBufferView() {
        //this.buffer = null;
        //this.byteOffset = 0;
        //this.byteLength = 0;
      };

    function _makeConstructor(bytesPerElement, typeName) {
      // Each TypedArray type requires a distinct constructor instance with
      // identical logic, which this produces.

      var ctor;
      ctor = function(buffer, byteOffset, length) {
        var array, sequence, i, s;

        if (!arguments.length || typeof arguments[0] === 'number') {
          // Constructor(unsigned long length)
          if (arguments[0] < 0) throw new RangeError('ArrayBufferView size is not a small enough positive integer');
          this.length = arguments[0];
          this.byteLength = this.length * this.BYTES_PER_ELEMENT;
          this.buffer = new ArrayBuffer(this.byteLength);
          this.byteOffset = 0;
        } else if (typeof arguments[0] === 'object' && arguments[0].constructor === ctor) {
          // Constructor(TypedArray array)
          array = arguments[0];
            console.log('from typedarray');

          this.length = array.length;
          this.byteLength = this.length * this.BYTES_PER_ELEMENT;
          this.buffer = new ArrayBuffer(this.byteLength);
          this.byteOffset = 0;

          for (i = 0; i < this.length; i += 1) {
            this._setter(i, array._getter(i));
          }
        } else if (typeof arguments[0] === 'object' &&
                   !(arguments[0] instanceof ArrayBuffer || ECMAScript.Class(arguments[0]) === 'ArrayBuffer')) {
          // Constructor(sequence<type> array)
          sequence = arguments[0];
            console.log('from norm array');

          this.length = sequence.length;
          this.byteLength = this.length * this.BYTES_PER_ELEMENT;
          this.buffer = new ArrayBuffer(this.byteLength);
          this.byteOffset = 0;

          for (i = 0; i < this.length; i += 1) {
            s = sequence[i];
            this.buffer[i] = Number(s);
          }
        } else if (typeof arguments[0] === 'object' &&
                   (arguments[0] instanceof ArrayBuffer || ECMAScript.Class(arguments[0]) === 'ArrayBuffer')) {
          // Constructor(ArrayBuffer buffer,
          //             optional unsigned long byteOffset, optional unsigned long length)
          //var buffer = arguments[0];

            this.buffer = buffer;

          this.byteOffset = ECMAScript.ToUint32(arguments[1]);
          if (this.byteOffset > this.buffer.byteLength) {
            throw new RangeError("byteOffset out of range");
          }

          if (this.byteOffset % this.BYTES_PER_ELEMENT) {
            // The given byteOffset must be a multiple of the element
            // size of the specific type, otherwise an exception is raised.
            throw new RangeError("ArrayBuffer length minus the byteOffset is not a multiple of the element size.");
          }

          if (arguments.length < 3) {
            this.byteLength = this.buffer.byteLength - this.byteOffset;

            if (this.byteLength % this.BYTES_PER_ELEMENT) {
              throw new RangeError("length of buffer minus byteOffset not a multiple of the element size");
            }
            this.length = this.byteLength / this.BYTES_PER_ELEMENT;
          } else {
            this.length = arguments[2];// ECMAScript.ToUint32(arguments[2]);
            this.byteLength = this.length * this.BYTES_PER_ELEMENT;
          }

          if ((this.byteOffset + this.byteLength) > this.buffer.byteLength) {
            throw new RangeError("byteOffset and length reference an area beyond the end of the buffer");
          }
        } else {
          throw new TypeError("Unexpected argument type(s)");
        }

        this.constructor = ctor;
        this._proxyGetter = this.buffer._proxy['get' + typeName];
        this._proxySetter = this.buffer._proxy['set' + typeName];

        configureProperties(this);
        makeArrayAccessors(this);

        assertNumber(this.length, 'length');
        assertNumber(this.byteOffset, 'byteOffset');
        assertNumber(this.byteLength, 'byteLength');

      };

      ctor.prototype = new ArrayBufferView();
      ctor.prototype.BYTES_PER_ELEMENT = bytesPerElement;
      ctor.BYTES_PER_ELEMENT = bytesPerElement;

      // getter type (unsigned long index);
      ctor.prototype._getter = function(index) {
          return this._proxyGetter(index);
      };

      // NONSTANDARD: convenience alias for getter: type get(unsigned long index);
      ctor.prototype.get = ctor.prototype._getter;

      // setter void (unsigned long index, type value);
      ctor.prototype._setter = function(index, value) {
          return this._proxySetter(index, value);
      };

      // void set(TypedArray array, optional unsigned long offset);
      // void set(sequence<type> array, optional unsigned long offset);
      ctor.prototype.set = function(value, offset) {
          if (arguments.length < 1) throw new SyntaxError("Not enough arguments");
          var array, sequence, offset, len,
              i, s, d,
              byteOffset, byteLength, tmp;

          if (typeof arguments[0] === 'object' && arguments[0].constructor === this.constructor) {
            // void set(TypedArray array, optional unsigned long offset);
            array = arguments[0];
            offset = ECMAScript.ToUint32(arguments[1]);

            if (offset + array.length > this.length) {
              throw new RangeError("Offset plus length of array is out of range");
            }

            byteOffset = this.byteOffset + offset * this.BYTES_PER_ELEMENT;
            byteLength = array.length * this.BYTES_PER_ELEMENT;

            if (array.buffer === this.buffer) {
              tmp = [];
              for (i = 0, s = array.byteOffset; i < byteLength; i += 1, s += 1) {
                tmp[i] = array.buffer._proxy.get(s);
              }
              for (i = 0, d = byteOffset; i < byteLength; i += 1, d += 1) {
                array.buffer._proxy.set(d, tmp[i]);
                  //this.buffer._bytes[d] = tmp[i];
              }
            } else {
              for (i = 0, s = array.byteOffset, d = byteOffset;
                   i < byteLength; i += 1, s += 1, d += 1) {
                  array.buffer._proxy.set(d, array.buffer._proxy.get(s));
                //this.buffer._bytes[d] = array.buffer._bytes[s];
              }
            }
          } else if (typeof arguments[0] === 'object' && typeof arguments[0].length !== 'undefined') {
            // void set(sequence<type> array, optional unsigned long offset);
            sequence = arguments[0];
            len = ECMAScript.ToUint32(sequence.length);
            offset = ECMAScript.ToUint32(arguments[1]);

            if (offset + len > this.length) {
              throw new RangeError("Offset plus length of array is out of range");
            }

            for (i = 0; i < len; i += 1) {
              s = sequence[i];
              this._setter(offset + i, Number(s));
            }
          } else {
            throw new TypeError("Unexpected argument type(s)");
          }
        };

      // TypedArray subarray(long begin, optional long end);
      ctor.prototype.subarray = function(start, end) {
      };

      return ctor;
    }

    native.ArrayBuffer = ArrayBuffer;
    native.Int8Array = _makeConstructor(1, 'Int8');
    native.Uint8Array = _makeConstructor(1, 'Uint8');
    //var Uint8ClampedArray = makeConstructor(1, packU8Clamped, unpackU8);
    native.Int16Array = _makeConstructor(2, 'Int16');
    native.Uint16Array = _makeConstructor(2, 'Uint16');
    native.Int32Array = _makeConstructor(4, 'Int32');
    native.Uint32Array = _makeConstructor(4, 'Uint16');
    native.Float32Array = _makeConstructor(4, 'Float32');
    native.Float64Array = _makeConstructor(8, 'Float64');

    return Object.freeze(native);
}
