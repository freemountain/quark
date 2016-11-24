const { Statechart } = require("quark");

module.exports = Statechart.of({
    type: {
        scrollPosition: Number,
        opacity:        Number
    },

    OPEN: {
		enter() {
			return this.set("opacity", 1);
		},

		onClose() {
			return this.changeState("CLOSED")
		},

		onLoggedOut: "onClose"
    },

    CLOSED: {
		enter() {
			return this.set("opacity", 0);
		},

		onOpen() {
			return this.changeState("OPEN");
		}
	},

	enter() {
		return this
			set("scrollPosition", 0)
			.changeState("CLOSED");
	},

	onScroll(e) {
		const state = e.scrollPosition.y > 50 && e.scrollPosition.y - this.get("scrollPosition") ? "OPEN" : "CLOSED";

		return this
			.set("scrollPosition", e.scrollPosition.y)
			.changeState(state);
	}
});
