export default class Intent {
    static of(...args) {
        return new Intent(...args);
    }

    constructor(intent, payload, stream) {
        this.timeout = 0;
        this.intent  = intent.bind(this);
        this.payload = payload;
        this.stream  = stream;
    }

    after(timeout) {
        this.timeout = this.timeout + timeout;

        return this;
    }

    trigger(type, payload) {
        setTimeout(() => this.stream.write({ type, payload }), this.timeout);

        return this;
    }
}
