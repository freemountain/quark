const Quark = require("quark");
const path  = require("path");
const Menu  = require("./Menu");
const User  = require("./User");
const Todos = require("./Todos");

/* const app = Quark.of({
    qml:          path.join(__dirname, "index.qml"),
    initialState: { count: 0 },
    intents:      {
        onSub: state => state.update("count", count => count - 1),
        onAdd: state => state.update("count", count => count + 1)
    }
});*/

const app = Quark.of({
    menu:  Menu,
	user:  User,
	todos: Todos
});
