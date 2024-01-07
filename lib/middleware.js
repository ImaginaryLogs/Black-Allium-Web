import { appError } from "./appError.js";

const isLogging = true;



export function logApp(req, res, isReveal, customMessage) {
	if (!isReveal) return;
	var color = '\u001b[0;15m';
	const reqMethod = req.method;
	switch (reqMethod) {
		case 'GET':
			color = '\u001b[1;32m';
			break;
		case 'POST':
			color = '\u001b[1;33m';
			break;
		case 'PUT':
			color = '\u001b[1;36m';
			break;
		case 'DELETE':
			color = '\u001b[1;31m';
			break;
	}
	var baseURL = req.baseUrl;
	baseURL == '' ? '/pub' : baseURL;
	console.log(`\u001b[0;33m${baseURL} ${color}${reqMethod} \u001b[0;15m${req.originalUrl}`);
	if (reqMethod == 'POST') {
		console.log(`\u001b[0;33m \\->REQ: \u001b[0;15m`);
		console.table(req.body)
	}
	console.log(`\u001b[0;32m \\->RES:\u001b[0;15m ${customMessage != ''  ? customMessage : req.path.substr(req.path.lastIndexOf('/') + 1)}`)
}

export const tryCatch = (controller) => async (req, res, next) => {
    try {
      await controller(req, res);
    } catch (error) {
      return next(error);
    }
};

export const errorHandler = (error, req, res, next) => {
	let color = '\u001b[0;15m';

	switch (req.method) {
		case 'GET':
			color = '\u001b[1;32m';
			break;
		case 'POST':
			color = '\u001b[1;33m';
			break;
		case 'PUT':
			color = '\u001b[1;36m';
			break;
		case 'DELETE':
			color = '\u001b[1;31m';
			break;
	}

	console.log(
		`\u001b[0;33m${req.baseUrl} ${color}${req.method} \u001b[0;15m${req.originalUrl}
\u001b[1;31m \\->ERR (${error.code}): \u001b[0;15m ${error.message}`
	);
	if (isLogging) console.error(error);

	if (error instanceof appError) {

	}

	switch (error.code) {
		case 'ERR_INVALID_ARG_TYPE':
			return res.status(400).send('No input');
		case 'ENOENT':
			return res.status(400).send('Bad input address');
	}
	return res.status(500).send(error.message);
};

export async function prowrap(promise, isLogging = false) {
	try {
		const result = await Promise.allSettled([promise]);
		if (result.find((res) => res.status === 'fulfilled')) {
			return {data: result.find((res) => res.status === 'fulfilled')?.value, error: null};
		}
		const error = result.find((res) => res.status === 'rejected')?.reason;
		if (isLogging) console.log(result);
		return {data: null, error: error};
	} catch (error) {
		if (isLogging) console.log(error);
		return {data: null, error: error};
	}
}
