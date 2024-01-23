import { authenticate } from '@google-cloud/local-auth'; //  Authentication server processes
import * as express from 'express';
import * as fs from 'fs';
import * as fsp from 'fs/promises'; //  File system module
import { google } from 'googleapis'; //  Google API module
import * as path from 'node:path'; //  File Path module
import * as process from 'node:process'; //  Process is a native Node.js module that provides info and control over current process.
import * as readline from 'node:readline';

import { errorHandler, logApp, result, tries } from '../middleware/middleware.js';
import { DEBUG_API } from '../config/settings.js';
import { LOG_API } from '../config/settings.js';
import { ApiError } from '../middleware/apiError.js';
import { NO_INTERNET_ACCESS } from '../config/errorCodes.js';

const urlScope = ['https://www.googleapis.com/auth/calendar'];
const pathClient = path.join(process.cwd(), 'src/client');
const pathCredit = path.join(pathClient, 'client_secrets.json');
const pathSetins = path.join(pathClient, 'client_settings.json');
const pathTOKENS = path.join(pathClient, 'token.json'); // Token is a generated id that automatically does authentication.
const pathDATABS = path.join(path.dirname(process.cwd()), 'db');
const regDateYMD = /^\d{4}-\d{2}-\d{2}$/;

const app = express.Router();

class taskEvents {
	constructor(Summary, Start = '', End = '') {
		let utcNow = new Date();
		let utcTom = new Date(
			Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1, 10, 0, 0)
		);
		let utcStart = isValidDate(Start) ? new Date(Start) : utcNow;
		let utcEnd = isValidDate(End) ? new Date(End) : utcTom;
		this.summary = `OBS: ${Summary}`;
		this.start = {
			dateTime: utcStart,
			timeZone: 'Asia/Manila',
		};
		this.end = {
			dateTime: utcEnd,
			timeZone: 'Asia/Manila',
		};
	}

	JSONdetails() {
		return {
			summary: this.summary,
			start: this.start,
			end: this.end,
		};
	}
}

const loadSavedSettings = async () => {
	try {
		let content = await fsp.readFile(pathSetins);
		let data = JSON.parse(content.toString());
		return data;
	} catch (err) {
		throw err;
	}
};

const SaveSettings = async (newInfo) => {
	let payloadSettings = {};
	payloadSettings = await result(loadSavedSettings());
	if (payloadSettings.ok) {
		payloadSettings = payloadSettings.data;
		for (const updatedKey of Object.keys(newInfo)) payloadSettings[updatedKey] = newInfo[updatedKey];
	} else {
		payloadSettings = {
			markdown_path: '',
			web: { '--bg': '#080808', '--text': 'white' },
		};
	}
	await fsp.writeFile(pathSetins, JSON.stringify(payloadSettings), 'utf-8', (err) => {
		if (err) throw err;
	});
};

const loadSavedCredits = async () => {
	try {
		const tokens = await fsp.readFile(pathTOKENS);
		const credentials = JSON.parse(tokens.toString());
		return google.auth.fromJSON(credentials);
	} catch (err) {
		return null;
	}
};

const saveNewCredits = async (client) => {
	const content = await fsp.readFile(pathCredit);
	const keys = JSON.parse(content.toString());
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	await fsp.writeFile(pathTOKENS, payload);
};

const authorize = async () => {
	let client = await loadSavedCredits();
	if (client) return client;
	client = await authenticate({
		scopes: urlScope,
		keyfilePath: pathCredit,
	});
	if (client.credentials) await saveNewCredits(client);
	return client;
};

const deauthorize = async () => {
	const payload = JSON.stringify({
		type: '',
		client_id: '',
		client_secret: '',
		refresh_token: '',
	});
	await fsp.writeFile(pathTOKENS, payload);
};

const eventDelete = async (auth, eventId) => {
	const calendar = google.calendar({ version: 'v3', auth });
	calendar.events.delete({
		calendarId: 'primary',
		eventId: eventId,
	});
	return `Deleted:${eventId}`;
};

const listEventsGoogleCalendar = async (auth) => {
	let data = {};
	let eventsList = [];
	let eventInfo = {};

	const calendar = google.calendar({ version: 'v3', auth });
	const res = await calendar.events.list({
		calendarId: 'primary',
		timeMin: new Date().toISOString(),
		maxResults: 100,
		singleEvents: true,
		orderBy: 'startTime',
	});
	const receivedData = res.data.items;
	if (!receivedData || receivedData.length === 0) {
		console.log('No upcoming events found.');
		return { events: '' };
	}
	receivedData.map((event, i) => {
		eventInfo = {};
		const start = event.start.dateTime || event.start.date;
		const end = event.end.dateTime || event.end.date;
		eventInfo = {
			item: String(i),
			date: String(start),
			event: event.summary,
			dateEnd: String(end),
			id: event.id,
		};
		eventsList.push(eventInfo);
	});
	data['events'] = eventsList;
	console.table(data['events']);
	return data;
};

const isValidDate = (dateString) => {
	if (!dateString.match(regDateYMD)) return false;

	let date = new Date(dateString);
	let dNum = date.getTime();

	if (!dNum && dNum !== 0) return false; // NaN value, Invalid date

	return date.toISOString().slice(0, 10) === dateString;
};

const createValidEvent = (eventString) => {
	const emojiDates = { start: '🛫', end: '📅', sched: '⏳', Done: '✅' };
	const dateDetails = (taskString = '', emojiType) => {
		return { index: taskString.indexOf(emojiDates[emojiType]), dateYMD: '' };
	};

	let index;
	let dateYMD;
	let minDate = eventString.length;
	let hasNoDateDetails = true;
	let criteria = {
		start: dateDetails(eventString, 'start'),
		end: dateDetails(eventString, 'end'),
		sched: dateDetails(eventString, 'sched'),
		done: dateDetails(eventString, 'done'),
	};

	for (const [dateType, dateObject] of Object.entries(criteria)) {
		index = dateObject.index;
		if (index == -1) continue;
		hasNoDateDetails = false;
		dateYMD = eventString
			.substring(index)
			.substring(2, 13)
			.replace(/^\s+|\s+$/gm, '');
		minDate = Math.min(index, minDate);
		dateObject['dateYMD'] = dateYMD;
	}

	let utcNow = new Date();
	const isEventOutdated = new Date(criteria['end']['dateYMD']).getTime() < utcNow.getTime();
	const hasDoneDate = criteria['done']['index'] != -1;
	const eventIsDone = hasNoDateDetails || hasDoneDate || isEventOutdated;

	if (eventIsDone) return {};

	const summary = eventString.substring(0, minDate).replace(/^\s+|\s+$/gm, '');
	const hasStartDate = criteria['start']['index'] != -1;
	const hasEndDate = criteria['end']['index'] != -1;
	let validData = {};

	if (hasStartDate || hasEndDate)
		validData = new taskEvents(summary, criteria['start']['dateYMD'], criteria['end']['dateYMD']);
	return validData;
};

const eventGetDesync = async (auth, syncedObj) => {
	let pubEventSummary = '';
	let eventsDesync = { tasks: [] };
	let hasNoKeys = false;
	let isMatched = false;
	let isEventSync = false;
	let hasSameSummary = false;

	const user_settings = await loadSavedSettings();
	const requestedEvents = await listEventsMarkdown(user_settings['markdown_path']);
	const publishedEvents = await listEventsGoogleCalendar(auth);

	const checkRequestIsFulfilled = (requestedEvent, publishedEvent) => {
		requestedEvent = createValidEvent(requestedEvent);
		hasNoKeys = Object.keys(requestedEvent).length == 0;
		hasSameSummary = publishedEvent['event'].localeCompare(requestedEvent.summary);

		if (hasNoKeys || hasSameSummary) return true;

		isEventSync = true;
		syncedObj['tasks'].push(publishedEvent['event'].slice('OBS: '.length));
		return false;
	};

	for (const publishedEvent of publishedEvents['events']) {
		isEventSync = false;

		if (!publishedEvent['event'].startsWith('OBS:')) continue;

		for (let requestedEvent of requestedEvents['tasks'])
			if (checkRequestIsFulfilled(requestedEvent, publishedEvent)) continue;

		if (!isEventSync) eventsDesync['tasks'].push(publishedEvent['id']);
	}

	return eventsDesync;
};

const listEventsMarkdown = async (address) => {
	var payload = { tasks: [] };
	const fileStream = fs.createReadStream(address);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});
	for await (const line of rl) {
		if (line.indexOf('- [') == -1) continue;
		var taskToDo = line.substring(line.indexOf('- [') + 6);
		payload['tasks'].push(taskToDo);
	}
	// console.log(payload);
	return payload;
};

const eventPublishMdToGc = async (auth, syncedTasks) => {
	let publishedEvents = { events: [] };
	let syncedEvent = false;
	let data = {};
	let validTaskObj = {};
	let insertResponse;
	const calendar = google.calendar({ version: 'v3', auth });

	const calendartInsertReq = (authentication, taskToInsert) => {
		return {
			auth: authentication,
			calendarId: 'primary',
			resource: taskToInsert.JSONdetails,
		};
	};
	console.log('Synced Objects:');
	console.log(syncedTasks);

	let settings = await loadSavedSettings();
	let eventsToList = await listEventsMarkdown(settings['markdown_path']);
	for (const task of eventsToList['tasks']) {
		syncedEvent = false;
		validTaskObj = createValidEvent(task);

		if (validTaskObj === null) continue;

		for (const syncedObject of syncedTasks['tasks']) {
			if (!validTaskObj.summary.includes(syncedObject)) continue;
			syncedEvent = true;
			break;
		}

		if (syncedEvent) continue;

		console.log(validTaskObj);
		data = calendartInsertReq(auth, validTaskObj);

		await calendar.events.insert(data, (err, eventA) => {
			if (err) throw err;
		});

		publishedEvents['events'].push(validTaskObj);
	}
	return publishedEvents;
};

app.use(express.json());

app.get(
	'/events/list/googleCalendar',
	tries(async (req, res) => {
		const client = await result(authorize());

		if (!client.ok) throw new ApiError(NO_INTERNET_ACCESS, 'No internet access', 400, client.err);

		const events = await result(listEventsGoogleCalendar(client.data));

		if (!events.ok) throw new ApiError(NO_INTERNET_ACCESS, 'No internet access', 400, events.err);

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(events.data), 'utf8', 'Writing...');
		res.end();
		logApp(req, res, LOG_API);
	})
);

app.get(
	'/events/list/markdown',
	tries(async (req, res) => {
		const settings = await loadSavedSettings();
		const md_address = settings['markdown_path'];
		const events = await listEventsMarkdown(md_address);

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(events), 'utf8', 'Writing...');
		res.end();
		logApp(req, res, LOG_API);
	})
);

app.get(
	'/events/sync',
	tries(async (req, res) => {
		let syncedObj = { tasks: [] };
		const API_MESSAGE = 'Syncing Tasks';

		const auth = await authorize();
		const desync = await eventGetDesync(auth, syncedObj);

		for (const eventIdDesynced of desync['tasks']) await eventDelete(auth, eventIdDesynced);

		const response = await eventPublishMdToGc(auth, syncedObj);
		console.log(response['events']);

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(response), 'utf8', 'Writing...');
		res.end();

		logApp(req, res, LOG_API, API_MESSAGE);
	})
);

app.get(
	'/settings/load',
	tries(async (req, res) => {
		const API_MESSAGE = 'Saved Settings';
		const settings = await result(loadSavedSettings());

		if (settings.err || settings.data === undefined) {
			await SaveSettings();
			settings = await result(loadSavedSettings());
		}

		if (settings.err) throw settings.err;
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(settings.data), 'utf8', 'Writing...');
		res.end();
		logApp(req, res, LOG_API, API_MESSAGE);
	})
);

app.post(
	'/settings/save',
	tries(async (req, res) => {
		const API_MESSAGE = 'Saved Settings';
		await SaveSettings(req.body);
		res.status(200).send(API_MESSAGE);

		logApp(req, res, LOG_API, API_MESSAGE);
	})
);

app.get(
	'/log-in',
	tries(async (req, res) => {
		const API_MESSAGE = 'Logged-In';
		let credits = await loadSavedCredits();
		if (credits.ok){
			res.set('Set-Cookie', 'session')
			res.status(200).send(API_MESSAGE);
			return;
		}
		credits = authorize();
		if (credits.err) throw credits.err;

		logApp(req, res, LOG_API, API_MESSAGE);
	})
);

app.post(
	'/log-out',
	tries(async (req, res) => {
		const API_MESSAGE = 'Logged-Out';
		await deauthorize();
		res.status(200).send(API_MESSAGE);
		logApp(req, res, LOG_API, API_MESSAGE);
	})
);

app.post(
	'/client/save',
	tries(async (req, res) => {
		console.log(req.url);
		const url = new URLSearchParams(req.url);
		const fileName = url.get('/client/save?filename');
		console.log('File Name: ' + fileName);
		req.on('data', (chunk) => {
			fs.appendFileSync(path.join(pathDATABS, fileName), chunk);
		});
		res.status(200).send('received');
		logApp(req, res, LOG_API, '');
	})
);

app.use(errorHandler);

export default app;
