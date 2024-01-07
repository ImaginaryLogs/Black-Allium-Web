export class appError extends Error {
	constructor(errorCode, message, statusCode){
		super(message);
		this.errorCode = errorCode;
		this.statusCode = statusCode;
	}
}
export const INVALID_ADDRESS = 600;
