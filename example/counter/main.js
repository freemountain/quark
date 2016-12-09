/* const Quark = require("quark");
const path  = require("path");

const app = Quark.of({
    qml:          path.join(__dirname, "index.qml"),
    initialState: { count: 0 },
    intents:      {
        onSub: state => state.update("count", count => count - 1),
        onAdd: state => state.update("count", count => count + 1)
    }
});*/

const { Domain } = require("quark");

module.exports = class QuarkCounter extends Domain {
    static props = {
        count: 0
    };

    sub() {
        return this.update("count", count => count - 1);
    }

    add() {
        return this.update("count", count => count + 1);
    }
}
