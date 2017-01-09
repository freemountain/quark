const Quark     = require("quark");
const derive    = Quark.derive;
const triggered = Quark.triggered;
const assert    = require("assert");
const path      = require("path");
const Immutable = require("immutable");

class Security extends Quark.Unit {
    // der errorfall triggert beim parent trotzdem done actions
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
    users:       [],
    currentUser: null,
    loggedIn:    derive(x => x.currentUser instanceof Object)
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
        })));
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
        // geinlined als props läuft
        // mit binding nich,
        // da müssen jetz die richtigen trigger angelegt werden:
        // 
        // derived property müsste aufm kind liegen
        // (users dadurch ersetzen quasi bei den deps)
        // parent muss nur das binding anlegen
        //
        // Security:
        //     users (computed): props
        //
        // QuarkLogin:
        //     security/props: props.done
        //      -> eigtl is das ne eigene action in quarklogin,
        //      die aus dem eigenen state das relevante extrahiert
        //      und dann als props an das kind sendet
        //
        //      -> PROBLEM: der pfad zeig eigtl auf die props action
        //      im kind
        //
        //      idee:
        //
        //      "children" action, die von props.done getriggert wird
        //      hierbei werden dann aus dem state die relevanten daten
        //      extrahiert und an das kind weitergegeben
        //
        //
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

