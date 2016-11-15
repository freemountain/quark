const shell = require('quark-shell');
const path = require('path');

shell((values, actions, qml) => {
  // initial state
  const value = {
    count: 0
  }

  // emit initial state
  values.emit('data', value);

  // subscribe to actions
  actions.on('data', action => {
    if(action.type === 'add') value.count += 1
    if(action.type === 'sub') value.count -= 1

    // emit new state
    values.emit('data', value);
  });

  // load application window
  qml.load(path.join(__dirname, 'index.qml'));
});
