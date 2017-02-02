const Quark = require('quark');
const path  = require('path');

Quark.of({
    qml:          path.join(__dirname, 'Controls2.qml'),
    initialState: {
        todos: [
            { id: 10, title: "learn QMl", completed: false },
            { id: 20, title: "learn JS", completed: true },
            { id: 30, title: "learn C++", completed: false }
        ]
    },

    intents: {
        onAddTodo(state, title) {
            return state.update("todos", todos => todos.concat({
                id:        Date.now(),
                title:     title,
                completed: false  
            }));
        },

        onFlipCompleted(state, id) {
            const updater = todo => todo.id === id ? Object.assign(todo, { 
                completed: !todo.completed
            }) : todo;

            return state.update("todos", todos => todos.map(updater));
        }
    }
});
