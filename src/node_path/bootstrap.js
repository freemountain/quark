const Quark  = require("quark");
const App    = require(process.argv[2]);
const path   = require("path");
const dir    = path.dirname(process.argv[2]);
const config = require(dir.concat("/package.json"));

console.error("Using config: ", config);

const quark = Quark.of(App);

// das hier klappt iwie noch nich, warum auch immer
quark.app.write({
    type:    "props",
    payload: {
        windows: [{
            qml: dir.concat("/").concat(config.initialQml)
        }]
    }
});


