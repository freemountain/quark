const Quark = require("quark");
const path  = require("path");

// require("shelljs/global");

const app = Quark.of({
    initialState: {
        apps: []
    },
    mappings: {
        startProcess: "onStart",
        deployApp:    "onDeploy"
    },
    intents: {
        onStart(state, dir) {
            console.error("start");
            return state.update("processes", processes => processes.concat(dir));
        },
        
        onDeploy(state, program) {
            console.error("deploy");
            return state.update("apps", apps => apps.concat(program))
        } 
    }
});

app.listen("processes").on("data", console.error.bind(console));
// app.listen("apps").on("data", console.error.bind(console));
//
/*
onDeploy: function() {
bundle: path.join(path.dirname(options.shellPath), '..', '..')
            const pkgJson = require(pkg);
            const name    = pkgJson.name || "quark";
            const target  = path.join(targetBase, `${name}.app`);
            const pkgBase = path.dirname(pkg);
            const appBase = path.join(target, "Contents", "Resources", "app");

            console.error("pkbBase", pkgBase);
            console.error("appBase", appBase);

            cp("-R", bundle, target);
            rm("-rf", appBase)
            cp("-R", pkgBase, appBase);
}
*/
