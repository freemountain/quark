const Quark = require("quark");
// const path  = require("path");

// require("shelljs/global");

const triggered = Quark.triggered;

class QuarkDefault extends Quark.Unit {
    start(dir) {
        return this.update("processes", processes => processes.concat({
            path: dir
        }));
    }
        
    deploy(program) {
        console.error("deploy", program);
        return this.update("apps", apps => apps.concat(program))
    } 
}

QuarkDefault.props = {
    apps:      [],
    processes: []
}

QuarkDefault.triggers = {
    start:  triggered.by("startProcess"),
    deploy: triggered.by("deployApp")
}

Quark.of(QuarkDefault);

// app.listen("processes").on("data", console.error.bind(console));
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
