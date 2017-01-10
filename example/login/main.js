const Quark     = require("quark");
const derive    = Quark.derive;
const triggered = Quark.triggered;
const assert    = require("assert");
const path      = require("path");
const Immutable = require("immutable");

class Security extends Quark.Unit {
    login({ username, password }) {
        const user = this.users.find(x => x.get("name") === username);

        assert(user, "You are trying to login with an unknown user.");
        assert(user.get("password") === password, "Your password is wrong.")

        return this.set("currentUser", user);
    }

    logout() {
        return this.delete("currentUser");
    }
}

Security.props = {
    users:         [],
    currentUser:   null,
    loggedIn:      derive(x => x.currentUser instanceof Object),
    // wird aus irgend nem grund null anstatt leer, aber checken, ob dass
    // nur der parentcursor is, oder ob da mehr dahinter steckt
    loggedInUsers: derive(x => x.users.filter(y => x.currentUser ? x.currentUser.get("name") === y.get("name") : false))
    // hier fehlt derive
    // dass da die argument angehangen werden bei dem ganzen zeug
    // partialRight beim dispatch in cursor
    //    .from("users", "currentUser")
    //    .filter((user, current) => user.get("name") === current)
};

Security.triggers = {
    login:  triggered.if(x => !x.loggedIn),
    logout: triggered.if(x => x.loggedIn)
}

class QuarkLogin extends Quark.Unit {
    // hierfür aus initialQml generisch state machen
    // am besten alles auf write umbauen, sodass this.trigger den neuen state returned
    // (kann ja alles awaitet werden anscheinend -> siehe childrenshit)
    openCounter(args) {
        // weitere updates von computed stuff wird nich runtergegeben
        // die bindings klappen noch nich (triggered.with)
        return this.update("windows", x => x.push(Immutable.Map({
            name: "counter",
            qml:  path.join(__dirname, "counter.qml")     
        }))).update("users", x => x.map(y => y.set("name", "Mu")));
    }

    // close von windows muss noch rein
    closeCounter() {
        return this.update("windows", windows => windows.filter(x => x.get("name") !== "counter"));
    }

    sub() {
        return this.update("count", count => count - 1);
    }

    add() {
        return this.update("count", count => count + 1);
    }
}

QuarkLogin.props = {
    // Users + addresses in ne eigene unit auslagern, die auf
    // Immutable.List aufbaut
    addresses: [{
        id:     0,
        street: "sesam"
    }],
    users: [{
        name:     "Me",
        password: "hard",
        address:  0
    }],

    width: 600,
    // width: derive
    //  .from("security.loggedIn")
    //  .map(x => x ? 600 : 200)

/* loginVisible: derive
 .from("security.loggedIn"),*/

    // der hier klappt nur, wenn kein kind da is
    // komischerweise, sodald kind => no derive
    /* users2: derive
        .from("users")
        .join("addresses")
            .on("address", (user, address) => user.address === address.id),*/

    
    security: new Security({
        users: derive
            .from("users")
            .join("addresses") // der join hier wird noch nich gemacht
            .on("address", (user, address) => user.address === address.id)
    }),
    windows:  [],
    count:    0
};

QuarkLogin.triggers = {
    openCounter: triggered
        .by("login.done")
        .with("counter.qml"), // das hier klappt noch nich
    closeCounter: triggered.by("logout.done"),
    sub:          triggered.if(x => x.security.loggedIn),
    add:          triggered.if(x => x.security.loggedIn)
};

module.exports = QuarkLogin;

