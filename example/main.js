const Quark = require("quark-shell");
const path  = require("path");

const qml          = path.join(__dirname, "index.qml");
const initialState = {
    count: 0
}

const intents = {
    onSub(state) {
        return state.update("count", count => count - 1);
    },

    onAdd(state) {
        return state.update("count", count => count + 1);
    }
};

const app = Quark.of({ qml, intents, initialState });
