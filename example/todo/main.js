const Quark  = require("quark");
const path   = require("path");
const assert = require("assert");
const derive = Quark.derive;

class QuarkTodo extends Quark.Unit {
    addTodo(title) {
        assert(this.currentId, "currentId: ".concat(this.currentId));

        return this.update("todos", todos => todos.concat({
            id:        this.currentId,
            title:     title,
            completed: false  
        }));
    }

    flipCompleted(id) {
        const updater = todo => id === todo.get("id") ? todo.set("completed", !todo.get("completed")) : todo;

        return this.update("todos", todos => todos.map(updater));
    }
}

QuarkTodo.props = {
    todos: [
        { id: 10, title: "learn QMl", completed: false },
        { id: 20, title: "learn JS", completed: true },
        { id: 30, title: "learn C++", completed: false }
    ],

    open: derive
        .from("todos")
        .filter(({ completed }) => !completed),

    completed: derive
        .from("todos")
        .filter(({ completed }) => completed),

    currentId: derive
        .from("todos")
        .sort((a, b) => b.id - a.id)
        .map(({ id }) => id + 1)
        .first(),

    windows: [{
        qml: path.join(__dirname, 'Controls2.qml')
    }, {
        qml: path.join(__dirname, 'Controls3.qml')
    }]
};

Quark.of(QuarkTodo);
