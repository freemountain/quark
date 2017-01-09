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

    // hier soll nachm login die felder im ersten fenster
    // verschwinden und dafür en logout button dahin
    logout() {
        return this.delete("currentUser");
    }
}

Security.props = {
    users:         [],
    currentUser:   null,
    loggedIn:      derive(x => x.currentUser instanceof Object),
    // wird aus irgend nem grund null anstatt leer
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
    openCounter() {
        return this.update("windows", x => x.push(Immutable.Map({
            qml: path.join(__dirname, "counter.qml")     
        }))).update("users", x => x.map(y => y.set("name", "Mu")));
    }

    // close von windows muss noch rein
    closeCounter() {
        return this.update("windows", windows => windows.clear());
    }

    sub() {
        return this.update("count", count => count - 1);
    }

    add() {
        return this.update("count", count => count + 1);
    }
}

QuarkLogin.props = {
    // Users in ne eigene unit auslagern, die auf
    // Immutable.List aufbaut
    users: [{
        name:     "Me",
        password: "hard"
    }],
    security: new Security({
        // aktuell wird der parent state nich geupdated
        // -> wahrscheinlich stimmt was mit dem mapping der diffs
        // nich, weil die ommen an: daher nich mappen, sondern
        // en patch machen un dann diffen
        users: derive
            .from("users")
    }),
    windows:  [],
    count:    0
};

QuarkLogin.triggers = {
    openCounter:  triggered.by("login.done"),
    closeCounter: triggered.by("logout.done"),
    sub:          triggered.if(x => x.security.loggedIn),
    add:          triggered.if(x => x.security.loggedIn)
};

module.exports = QuarkLogin;

