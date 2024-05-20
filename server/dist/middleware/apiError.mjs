export class apiError extends Error {
    constructor(name, message, stacktrace = "") {
        super(message);
        this.message = message;
        this.name = name;
        this.stack = stacktrace;
    }
}
//# sourceMappingURL=apiError.mjs.map