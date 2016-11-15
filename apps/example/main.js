const shell = require('quark-shell');
const path = require('path');

const addTodo = (todos, title) => {
  const newTodo = {
    id: Date.now(),
    title,
    completed: false
  };

  return todos.concat(newTodo);
}

const flipCompleted = (todos, id) => {
  return todos.map(todo => {
    if(todo.id !== id) return todo;

    return Object.assign({}, todo, { completed: !todo.completed });
  });
}


shell((values, actions, qml, options) => {
  let todos = [
    { id: 10, title: "learn QMl", completed: false },
    { id: 20, title: "learn JS", completed: true },
    { id: 30, title: "learn C++", completed: false }

  ];

  values.emit('data', todos);
  console.error('hello');
  actions.on('data', action => {
    if(action.type === 'addTodo') todos = addTodo(todos, action.payload);
    if(action.type === 'flipCompleted') todos = flipCompleted(todos, action.payload);

    values.emit('data', todos);
  });

  qml.load(path.join(__dirname, 'index.qml'));
});
