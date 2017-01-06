const Quark     = require("quark");
const derive    = Quark.derive;
const triggered = Quark.triggered;
const assert    = require("assert");
const path      = require("path");

class Security extends Quark.Unit {
    login({ username, password }) {
        const user = this.users.find(x => x.get("name") === username);

        assert(user, "You are trying to login with an unknown user.");
        assert(user.get("password") === password, "Your password is wrong.")

        return this.set("currentUser", user);
    }
}

Security.props = {
    users:      [{
        name:     "Me",
        password: "hard"
    }],
    currentUser: null,
    loggedIn:    derive(x => x.currentUser instanceof Object)
};

class QuarkLogin extends Quark.Unit {
    openCounter() {
        console.error("###openCounter");
        return this.windows.concat({
             qml: path.join(__dirname, "counter.qml")    
        });
    }
    /* sub() {
        return this.update("count", count => count - 1);
    }

    add() {
        return this.update("count", count => count + 1);
    }*/
}

QuarkLogin.props = {
    security: new Security(),
    windows:  []
    // count: 0
};

QuarkLogin.triggers = {
    openCounter: triggered.by("login.done")
};

module.exports = QuarkLogin;

