import { DEBUG_API, LOG_MIDDLEWARE } from '../config/settings.js';
import { ApiError } from './apiError.js';

/**
 * Colors for debugging and logging events in the server.
 */
const GREN = '\u001b[1;32m';
const GOLD = '\u001b[1;33m';
const BLUE = '\u001b[1;36m';
const REDS = '\u001b[1;31m';
const BLNK = '\u001b[0;15m';
const BRCOR = '\u2514';
const COLORS = {
	GREN: GREN,
	GOLD: GOLD,
	BLUE: BLUE,
	REDS: REDS,
};

const getColors = (option) => ({ COLORS }[option] ?? BLNK);

export function logApp(req, res, isReveal, customMessage = null) {
	if (!isReveal) return;
	const reqMethod = req.method;
	const reqColor = getColors(reqMethod);
	const baseURL = req.baseUrl == '' ? '/pub' : req.baseUrl;
	customMessage = customMessage ?? req.path.substr(req.path.lastIndexOf('/') + 1);

	console.log(`${GOLD}${baseURL} ${reqColor}${reqMethod} ${BLNK}${req.originalUrl}`);

	if (reqMethod == 'POST') {
		console.log(`${GOLD}${BRCOR}->REQ:${BLNK}===============|`);
		console.table(req.body);
	}
	console.log(`${GREN}${BRCOR}->RES: ${BLNK}${customMessage}`);
}

export const tries = (controller) => async (req, res, next) => {
	try {
		await controller(req, res);
	} catch (error) {
		return next(error);
	}
};

export const errorHandler = (error, req, res, next) => {
	let reqColor = getColors(req.method);

	if (LOG_MIDDLEWARE) {
		console.log(`${GOLD}${req.baseUrl} ${reqColor}${req.method} ${BLNK}${req.originalUrl}`);
		console.log(`${REDS}${BRCOR}->ERR (${error.code}): ${BLNK} ${error.message}`);
		console.error(error);
	} else {
		console.log(`${REDS}SERVER ERROR${BLNK}`);
	}

	if (error instanceof ApiError) {
		if (DEBUG_API) console.table(error.origin);
		return res.status(error.status).json({
			errorCode: error.code,
		});
	}

	switch (error.code) {
		case 'ERR_INVALID_ARG_TYPE':
			return res.status(400).send('No input');
		case 'ENOENT':
			return res.status(400).send('Bad input address');
	}

	return res.status(500).send(error.message);
};

export const result = async (promise, isLogging = false) => {
	try {
		const result = await Promise.allSettled([promise]);
		if (result.find((res) => res.status === 'fulfilled'))
			return { ok: true, data: result.find((res) => res.status === 'fulfilled')?.value, err: null };
		const error = result.find((res) => res.status === 'rejected')?.reason;
		if (isLogging) console.log(result);
		return { ok: false, data: null, err: error };
	} catch (error) {
		if (isLogging) console.log(error);
		return { ok: false, data: null, err: error };
	}
};

export const filesend = async (file, url) => {
	const fileReader = new FileReader();
	const uploader = async (event) => {
		const fileContent = event.target.result;
		const CHUNK_SIZE = 8000; //Kilobytes
		const totalChunks = fileContent.byteLength / CHUNK_SIZE;
		let DATACHUNK, response;
		for (let chunk = 0; chunk < totalChunks + 1; chunk++) {
			DATACHUNK = fileContent.slice(chunk * CHUNK_SIZE, (chunk + 1) * CHUNK_SIZE);
			response = {
				method: 'POST',
				headers: {
					'content-type': 'application/octet-stream',
					'content-length': DATACHUNK.length,
				},
				body: DATACHUNK,
			};
			await fetch(url + '?filename=' + file.name, response);
		}
	};
	fileReader.readAsArrayBuffer(file);
	fileReader.onload = uploader;
};
