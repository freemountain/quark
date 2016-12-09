const { Domain } = require('quark');
const path       = require('path');

module.exports = class QuarkTodo extends Domain {
    static props = {
        todos: [
            { id: 10, title: "learn QMl", completed: false },
            { id: 20, title: "learn JS", completed: true },
            { id: 30, title: "learn C++", completed: false }
        ],

        completed: derive
            .from("todos")
            .filter(({ completed }) => completed),

        nonCompleted: derive
            .from("todos")
            .filter("completed")

        currentId: derive
            .from("todos")
            .sort((a, b) => a.id - b.id)
            .map(({ id }) => id + 1)
            .shift()

        windows: [
            path.join(__dirname, 'Controls2.qml')
        ]
    };

    addTodo(title) {
        return this.update("todos", todos => todos.concat({
            id:        this.currentId,
            title:     title,
            completed: false  
        }).sort(QuarkTodo.Sort.INCREMENT));
    },

    flipCompleted(state, id) {
        const updater = todo => todo.id === id ? todo.set("completed", !todo.completed) : todo;

        return state.update("todos", todos => todos.map(updater));
    }
}
