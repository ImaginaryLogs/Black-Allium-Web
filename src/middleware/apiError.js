export class ApiError extends Error {
	constructor(errorCode, message, statusCode, origin = null) {
		super(message);
		this.code = errorCode;
		this.status = statusCode;
		this.origin = origin;
	}
}
