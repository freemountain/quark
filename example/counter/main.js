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

const Quark = require("quark");

class QuarkCounter extends Quark.Unit {
    sub() {
        return this.update("count", count => count - 1);
    }

    add() {
        return this.update("count", count => count + 1);
    }
}

QuarkCounter.props = {
    count: 0
};

module.exports = QuarkCounter;

