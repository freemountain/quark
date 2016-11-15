const util = require('util');
const Stream = require('stream');
const StringDecoder = require('string_decoder').StringDecoder;

const Transform = Stream.Transform;

const msgTransform = type => new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(payload, encoding, callback) {
    callback(null, { type, payload });
  },
});

const msgFilter = type => new Transform({
  readableObjectMode: true,
  writableObjectMode: true,
  transform(msg, encoding, callback) {
    if (msg.type === type) callback(null, msg.payload);
  },
});

const stringify = () => new Transform({
  writableObjectMode: true,
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    callback(null, `${JSON.stringify(chunk)}\n`);
  },
});

const parse = () => new Transform({
  writableObjectMode: true,
  readableObjectMode: true,
  transform(chunk, encoding, callback) {
    callback(null, JSON.parse(chunk));
  },
});

const splitLines = () => {
  const decoder = new StringDecoder('utf8');
  let buffer = '';
  return new Transform({
    transform(chunk, encoding, callback) {
      const str = decoder.write(chunk);
      for (let i = 0, len = str.length; i < len; i++) {
        const current = str[i];

        if (current !== '\n') {
          buffer = buffer + current;
        } else {
          callback(null, buffer);
          buffer = '';
        }
      }
    },
  }).setEncoding('utf8');
};

const createOut = (type) => {
  const out = new Stream({ objectMode: true });

  out
    .pipe(msgTransform(type))
    .pipe(stringify())
    .pipe(process.stdout);

  return out;
};

const createLog = (logOut) => {
  const log = payload => logOut.emit('data', payload);
  log.error = e => log(`error: ${util.inspect(e)}`);

  return log;
};

const parseArgv = (argv) => {
  const result = {};
  let key, value
  for (var i = 2; i < argv.length; i = i + 2) {
    key = argv[i].slice(2);
    value = argv[i + 1];
    result[key] = value;
  }
  return result;
}
module.exports = (handler) => {
  const actionOut = createOut('action');
  const valueOut = createOut('value');

  const actions = process.stdin
    .pipe(splitLines())
    .pipe(parse())
    .pipe(msgFilter('action'))
    ;

  const options = parseArgv(process.argv);
  const qml = {
    load: url => actionOut.emit('data', { type: 'loadQml', payload: { url } }),
    startProcess: payload => actionOut.emit('data', { type: 'startProcess', payload }),
  };

  handler(valueOut, actions, qml, options);
};
