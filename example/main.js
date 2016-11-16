const Quark = require("./Quark");
const path  = require("path");

const app = Quark.of({
    qml:          path.join(__dirname, "index.qml"),
    initialState: {
        count: 0
    },
    intents: {
        onSub(state) {
            return state.update("count", count => count - 1);
        },

        onAdd(state) {
            return state.update("count", count => count + 1);
        }
    }
});
