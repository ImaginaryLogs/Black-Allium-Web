export class apiError extends Error {
    constructor (name: string, message: string, stacktrace: string = "") {
        super(message);
        this.message = message;
        this.name = name;
        this.stack = stacktrace;
    }
}