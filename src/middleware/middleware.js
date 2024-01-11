import { appError } from './appError.js';

const LOG_MIDDLEWARE = true;
const GREN = '\u001b[1;32m';
const GOLD = '\u001b[1;33m';
const BLUE = '\u001b[1;36m';
const REDS = '\u001b[1;31m';
const BLNK = '\u001b[0;15m';
const BRCOR = '\u2514';

const getColor = (method) => {
	switch (method) {
		case 'GET':
			return GREN;
		case 'POST':
			return BLUE;
		case 'PUT':
			return GOLD;
		case 'DELETE':
			return REDS;
		default:
			return BLNK;
	}
};

export function logApp(req, res, isReveal, customMessage = '') {
	if (!isReveal) return;
	const reqMethod = req.method;
	const reqColor = getColor(reqMethod);
	const baseURL = req.baseUrl == '' ? '/pub' : req.baseUrl;
	customMessage = customMessage != '' ? customMessage : req.path.substr(req.path.lastIndexOf('/') + 1);

	console.log(`${GOLD}${baseURL} ${reqColor}${reqMethod} ${BLNK}${req.originalUrl}`);

	if (reqMethod == 'POST') {
		console.log(`\u001b[0;33m ${BRCOR}->REQ: \u001b[0;15m`);
		console.table(req.body);
	}

	console.log(`\u001b[0;32m ${BRCOR}->RES:\u001b[0;15m ${customMessage}`);
}

export const tryCatch = (controller) => async (req, res, next) => {
	try {
		await controller(req, res);
	} catch (error) {
		return next(error);
	}
};

export const errorHandler = (error, req, res, next) => {
	let reqColor = getColor(req.method);

	console.log(`${GOLD}${req.baseUrl} ${reqColor}${req.method} ${BLNK}${req.originalUrl}`);
	console.log(`${REDS}${BRCOR}->ERR (${error.code}): ${BLNK} ${error.message}`);

	if (LOG_MIDDLEWARE) console.error(error);

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
		if (result.find((res) => res.status === 'fulfilled'))
			return { data: result.find((res) => res.status === 'fulfilled')?.value, error: null };
		const error = result.find((res) => res.status === 'rejected')?.reason;
		if (isLogging) console.log(result);
		return { data: null, error: error };
	} catch (error) {
		if (isLogging) console.log(error);
		return { data: null, error: error };
	}
}
