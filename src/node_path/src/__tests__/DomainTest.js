import Domain from "../Domain";
import Property from "../domain/Property";
import Trigger from "../domain/Trigger";
import { expect } from "chai";

const derive    = Property.derive;
const triggered = Trigger.triggered;

class Security extends Domain {
    static props = {
        currentUser: null,
        users:       [],
        loggedIn:    derive(x => x.has("currentUser"))
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

class Addresses extends Domain {
    static props = [{
        id:     0,
        street: []
    }];

    add(address) {
        const id = Math.random();

        return this.set(id, address.set("id", id));
    }
}

class Users extends Domain {
    static props = {
        security: new Security({
            currentUser: derive
                .from("users")
                .filter(({ loggedIn }) => loggedIn)
                .pop()
        }),
        open:      true,
        addresses: new Addresses([{
            id:     0,
            street: ""
        }]),
        users: [{
            id:        0,
            name:      "no user",
            addressId: 0,
            address:   derive.from("addresses")
                .join("users")
                .on((address, user) => address.id === user.addressId)
                .cascade("POST", "PUT", "DELETE")
        }]
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


class Message extends Domain {
    static props = {
        successMessage: null,
        hidden:         derive(x => x.has("successMessage"))
    };

    static triggers = {
        hideSuccess: triggered.by("showSuccess.done").after(500)
    }

    // @Trigger("showSuccess.done").defer(500)
    hideSuccess() {
        return this.set("successMessage", null);
    }

    showSuccess(message) {
        return this.set("successMessage", message);
    }
}

class App extends Domain {
    static props = {
        users: new Users({
            open: derive
				.from("window.height")
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

describe("DomainTest", function() {
    it("creates a domain", function(cb) {
        const domain = new App();

        domain.receive({
            type:    "login",
            payload: [0, "huhu"]
        }).then(result => {
            expect(result).to.eql([]);
        }).catch(cb);
    });
});
