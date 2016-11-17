const Quark = require("quark");
const path  = require("path");

// require("shelljs/global");

const app = Quark.of({
    initialState: {
        apps: []
    },
    intents: {
        onStartProcess(state, dir) {
            return state.update("processes", processes => processes.concat(dir));
        },
        
        onDeployApp(state, program) {
            return state.update("apps", apps => apps.concat(program))
        } 
    }
});

app.listen("processes").on("data", console.error.bind(console));
// app.listen("apps").on("data", console.error.bind(console));
//
/*
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
*/
