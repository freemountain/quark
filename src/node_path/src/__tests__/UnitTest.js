import Unit from "../Unit";
import Property from "../domain/Property";
import Trigger from "../domain/Trigger";
import { expect } from "chai";
import map from "through2-map";

const derive    = Property.derive;
const triggered = Trigger.triggered;

class Security extends Unit {
    static props = {
        currentUser: null,
        users:       [],
        loggedIn:    derive(x => x.has("currentUser")),
        loggedIn2:   derive
            .from("users")
            .has("currentUser")
    }

    static triggers = {
        login: triggered
            .if(x => !x.get("loggedIn"))
            .by("blub"),

        logout: triggered.if(x => x.get("loggedIn"))
    }

    // @Guard(x => x.get("loggedIn")
    // @Trigger("blub")
    login(id, password) {
        const user = this.users.find(x => x.id === id && x.password === password);

        return this.set("currentUser", user);
    }

    // @Guard(x => !x.get("loggedIn"))
    logout() {
        return this.model.update();
    }
}

/*
class Security extends Unit {
    @Type(User.maybe())
    currentUser: null

    @Type([User])
    users: []

    @Type(boolean)
    loggedIn: derive(x => x.has("currentUser"))

    @Type([User])
    loggedIn2 = derive
        .from("users")
        .has("currentUser")

    @Action
    @Guard(x => !x.get("loggedIn"))
    @Trigger("blub")
    login(id, password) {
        const user = this.users.find(x => x.id === id && x.password === password);

        return this.set("currentUser", user);
    }

    @Action
    @Guard(x => !x.get("loggedIn"))
    logout() {
        return this.model.update();
    }
}
#*/

// TODO: needs to work with lists, too:
// dafür cursor un target anpassen, sodass
// cursor.props die props sind und target
// nen call auf _unit durchlässt, ohne
// an die props zu gehen
// throw new Error("hier weiter");

class Addresses extends Unit { // eslint-disable-line
    static props = [{
        id:     0,
        street: ""
    }];

    add(address) {
        const id = Math.random();

        return this.set(id, address.set("id", id));
    }
}

class Users extends Unit {
    static props = {
        security: new Security({
            currentUser: derive
                .from("users")
                .filter(({ loggedIn }) => loggedIn)
                .pop()
        }),

        open:  true,
        users: [{
            id:       0,
            loggedIn: false,
            name:     "first"
        }, {
            id:       1,
            loggedIn: false,
            name:     "second"
        }]


        // Hier is das problem mit nich map sondern liste
        /* addresses: new Addresses([{
            id:     0,
            street: ""
        }])*/

        // Hier is das problem, dass das auf was dependet, was noch nich da is,
        // hier muss also allgemein das dann ignoriert werden, bis setParent
        // gecalled wird
        /* users: derive.from("users")
            .join("addresses")
            .on("address", (user, address) => user.address === address.id)
            .cascade("POST", "PUT", "DELETE")*/
    }

    static triggers = {
        getUser: triggered
            .by("getUser.done")
            .if(x => x.get("height") < 100)
    }

    // @Trigger("getUser.done")
    // @Guard(x => x.get(„height“) < 100)
    getUser() {
		// folgende states:
		//   before
		//   pending
		//   cancelled
		//   success
        //   error

        return this.update("height", x => x + 1);
    }
}


class Message extends Unit {
    static props = {
        successMessage: null,
        hidden:         derive(x => x.has("successMessage"))
    };

    static triggers = {
        hideSuccess: triggered.by("showSuccess.done").after(500)
    }

    hideSuccess() {
        return this.set("successMessage", null);
    }

    showSuccess(message) {
        return this.set("successMessage", message);
    }
}

class App extends Unit { // eslint-disable-line
    static props = {
        users: new Users({
            open: derive
                .from("windows")
                .first()
                .map(x => x.height > 100),

            test: triggered
                .by("getUser"),

            getUser: triggered
                .by("test")
                .by("window.open.done")
        }),

        message: new Message({
            showSuccess: triggered
                .by("users.getUser.done")
                .with(x => `successfully added user ${x}.`)
        }),

        windows: [{
            view:   "bla.qml",
            width:  100,
            height: 100,
            menu:   {}
        }]
    }
}

describe("UnitTest", function() { // eslint-disable-line
    it("creates a domain", function(done) {
        const security = new Security();

        expect(security.triggers()).to.eql({
            login:     ["login", "blub"],
            logout:    ["logout"],
            props:     ["props", "currentUser.done", "users.done", "login.done", "logout.done"],
            loggedIn:  ["props.done", "loggedIn"],
            loggedIn2: ["users.done", "props.done", "loggedIn2"]
        });

        security.on("data", data => {
            try {
                expect(data).to.eql([{
                    op:    "replace",
                    path:  "/_unit/revision",
                    value: 1
                }, {
                    op:    "add",
                    path:  "/users",
                    value: []
                }, {
                    op:    "replace",
                    path:  "/_unit/revision",
                    value: 3
                }, {
                    op:    "add",
                    path:  "/loggedIn",
                    value: false
                }, {
                    op:    "add",
                    path:  "/loggedIn2",
                    value: false
                }]);
                expect(security.toJS()).to.eql({
                    users:     [],
                    loggedIn:  false,
                    loggedIn2: false
                });

                done();
            } catch(e) {
                done(e);
            }
        });
    });

    it("creates a nested domain", function(done) { // eslint-disable-line
        const users = new Users();

        // hier fehlt das binding zwischen der derived
        // property bei security und users.done (wg derive.
        // from)
        expect(users.triggers()).to.eql({
            getUser:  ["getUser", "getUser.done"],
            props:    ["props", "open.done", "users.done", "security.done", "getUser.done"],
            security: ["users.done"]
        });

        users.pipe(map.obj(data => {
            console.log(data);

            return data;
        })).on("error", done);

        setTimeout(() => done(), 1000);

    /* users.on("data", data => {
            try {
                // hier müssen alle diffs rauskommen, sprich:
                // bei children muss on Data en update gemacht werden
                // + die diffs auf parent umgeschrieben und dann emittet
                // werden
                /* expect(data).to.eql([{
                    op:    "replace",
                    path:  "/security/_unit/revision",
                    value: 1
                }, {
                    op:    "add",
                    path:  "/security/users",
                    value: []
                }, {
                    op:    "replace",
                    path:  "/security/_unit/revision",
                    value: 3
                }, {
                    op:    "add",
                    path:  "/security/loggedIn",
                    value: false
                }, {
                    op:    "add",
                    path:  "/security/loggedIn2",
                    value: false
                }]);

                expect(data).to.eql([{
                    op:    "replace",
                    path:  "/_unit/revision",
                    value: 1
                }, {
                    op:    "add",
                    path:  "/open",
                    value: true
                }, {
                    op:    "add",
                    path:  "/users",
                    value: [{
                        id:       0,
                        loggedIn: false,
                        name:     "first"
                    }, {
                        id:       1,
                        loggedIn: false,
                        name:     "second"
                    }]
                }, {
                    op:    "add",
                    path:  "/security",
                    value: {}
                }]);

        /* expect(users.toJS()).to.eql({
                    security: {
                        users:     [],
                        loggedIn:  false,
                        loggedIn2: false
                    },
                    open:  true,
                    users: [{
                        id:       0,
                        loggedIn: false,
                        name:     "first"
                    }, {
                        id:       1,
                        loggedIn: false,
                        name:     "second"
                    }]
            });
                console.log(data);

                // done();
            } catch(e) {
                done(e);
            }
        });*/
    });


/* it("creates a domain", function() {
        // im state einen speziellen key actions
        // reservieren, der speichert die reihenfolge
        // Dadurch kann der state später auch wieder
        // entkoppelt werden
        // TODO:
        // - initial state checken
        // - diverse actions checken (dabei trigger testen)
        // - trigger unit test
        // - join unit test
        const domain = new App();

        // expect(domain.update()).to.eql([]);

        // expect(domain).to.be.an("object");
        expect(domain.cursor.toJS()).to.eql({});

        /* domain.receive({
            type:    "login",
            payload: [0, "huhu"]
        }).then(result => {
            expect(result).to.eql([]);
        }).catch(cb);
});*/
});
