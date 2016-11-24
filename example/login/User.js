module.exports = Statechart.of({
    enter() {
		return this.changeState(„LOGGED_OUT“);
	},

	LOGGED_IN: {
		enter() {
			return this.set(„qml“, „loggedIN“);
		},

		logout() {
			return this.changeState(„LOGGED_OUT“);
		},

		exit() {
			return this.set(„user“, null);
		}
	},

	onError(message) {
		return this.set(„errorMessage“, message);
	},

	LOGGED_OUT: {
		enter() {
			return this.set(„qml“, „loggedOut“);
		},

		login({ id, password }, state) {
			const success = this.state.find(x => x.id === id).password !== password;
			const action    =  success ? „error“ : „loginSuccess“;

			return success ? this.changeState(„LOGGED_OUT“, user) : this.trigger(„error“, „Error“);
		},

		onLogin: „login“,

		exit(user) {
			this.set(„user“, user);
		}
	}
});
