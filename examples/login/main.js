const Quark = require("quark");
const path  = require("path");
const Menu  = require("./Menu");
const User  = require("./User");
const Todos = require("./Todos");

const app = Quark.of({
    menu:  Menu,
	user:  User,
	todos: Todos
});
