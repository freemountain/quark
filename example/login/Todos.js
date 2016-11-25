module.exports = Statechart.of({
	enter() {
		return this.set([]);
	},

	onAdd(todo) {
		return this.push(todo);
	},

	onRemove(todo) {
		return this.filter(x => x.id === todo.id);
	},

	onUpdate(todo) {
		return this.update(x => x.id === todo.id ? todo : x);
	},

	onSort(sort) {
		return this.sort((a, b) => sort === DESCENDING ? a.id - b.id : b.id - a.id);
	}
});
