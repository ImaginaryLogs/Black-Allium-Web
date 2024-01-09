import { authenticate } from '@google-cloud/local-auth'; //  Authentication server processes
import * as express from 'express';
import * as fs from 'fs';
import * as fsp from 'fs/promises'; //  File system module
import { google } from 'googleapis'; //  Google API module
import * as path from 'node:path'; //  File Path module
import * as process from 'node:process'; //  Process is a native Node.js module that provides info and control over current process.
import * as readline from 'node:readline';
import { errorHandler, logApp, prowrap, tryCatch } from './middleware.js';
const urlScope = ['https://www.googleapis.com/auth/calendar'];
const pathClient = path.join(process.cwd(), 'client');
const pathCredit = path.join(pathClient, 'client_secrets.json');
const pathSetins = path.join(pathClient, 'client_settings.json');
const pathTOKENS = path.join(pathClient, 'token.json'); // Token is a generated id that automatically does authentication.
const pathDATABS = path.join(path.dirname(process.cwd()),'db');

const regDateYMD = /^\d{4}-\d{2}-\d{2}$/;


const app = express.Router();
const port = 8081;
const isDebugging = false,
	isLogging = true;

class taskEvents {
	constructor(Summary, Start = '', End = '') {
		let utcNow = new Date();
		let utcTom = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1, 10, 0, 0));
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
	payloadSettings = await prowrap(loadSavedSettings());
	if (payloadSettings.error){
		payloadSettings = {
					markdown_path: '',
					web: {'--bg': '#080808', '--text': 'white'},
				};
	} else {
		payloadSettings = payloadSettings.data;
		for (const updatedKey of Object.keys(newInfo)) payloadSettings[updatedKey] = newInfo[updatedKey];
	}
	await fsp.writeFile(pathSetins, JSON.stringify(payloadSettings), "utf-8", (err) => {if (err) throw err});
};

const loadSavedCredits = async () => {
	const tokens = await fsp.readFile(pathTOKENS);
	const credentials = JSON.parse(tokens.toString());
	return google.auth.fromJSON(credentials);
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
	try {
		const calendar = google.calendar({version: 'v3', auth});
		calendar.events.delete({
			calendarId: 'primary',
			eventId: eventId,
		});
		return `Deleted:${eventId}`;
	} catch (error) {
		throw error;
	}
};

const listEventsGoogleCalendar = async (auth) => {
	const calendar = google.calendar({version: 'v3', auth});
	const res = await calendar.events.list({
		calendarId: 'primary',
		timeMin: new Date().toISOString(),
		maxResults: 30,
		singleEvents: true,
		orderBy: 'startTime',
	});
	const receivedData = res.data.items;
	if (!receivedData || receivedData.length === 0) {
		console.log('No upcoming events found.');
		return {events: ''};
	}
	let data = {},
		eventsList = [],
		eventInfo = {};
	receivedData.map((event, i) => {
		eventInfo = {};
		const start = event.start.dateTime || event.start.date;
		const end = event.end.dateTime || event.end.date;
		eventInfo = {item: String(i), date: String(start), event: event.summary, dateEnd: String(end), id: event.id};
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

const eventCheckValid = (eventString) => {
	const emojiDates = {start : '🛫', end : '📅', sched: '⏳', Done:'✅'};
	let stringIndex,
		validData = {},
		minDate = eventString.length,
		isValidDate = false,
		dateParams = {
			dateStart: {
				dateIndex: eventString.indexOf(emojiDates.start),
				dateYMD: '',
			},
			dateEnd: {
				dateIndex: eventString.indexOf(emojiDates.end),
				dateYMD: '',
			},
			dateSched: {
				dateIndex: eventString.indexOf(emojiDates.sched),
				dateYMD: '',
			},
			dateDone: {
				dateIndex: eventString.indexOf(emojiDates.Done),
				dateYMD: '',
			},
		};
	for (const [dateType, dateObject] of Object.entries(dateParams)) {
		stringIndex = dateObject.dateIndex;
		if (stringIndex == -1) continue;
		isValidDate = true;
		let dateYMD = eventString
			.substring(stringIndex)
			.substring(2, 13)
			.replace(/^\s+|\s+$/gm, '');
		minDate = stringIndex < minDate ? stringIndex : minDate;
		dateObject['dateYMD'] = dateYMD;
	}

	let utcNow = new Date();

	if (
		!isValidDate ||
		dateParams['dateDone']['dateIndex'] != -1 ||
		new Date(dateParams['dateEnd']['dateYMD']).getTime() < utcNow.getTime()
	)
		return {};

	let summary = eventString.substring(0, minDate).replace(/^\s+|\s+$/gm, '');

	if (dateParams['dateStart']['dateIndex'] != -1 || dateParams['dateEnd']['dateIndex'] != -1)
		validData = new taskEvents(summary, dateParams['dateStart']['dateYMD'], dateParams['dateEnd']['dateYMD']);
	return validData;
};

const eventGetDesync = async (auth, syncedObj) => {
	let isEventSync = false,
		pubEventSummary = '',
		eventsDesync = {tasks: []};
	const settings = await loadSavedSettings();
	const requestedEvents = await listEventsMarkdown(settings['markdown_path']);
	const publishedEvents = await listEventsGoogleCalendar(auth);
	for (const publishedEvent of publishedEvents['events']) {
		isEventSync = false;
		let taskIdentifier = publishedEvent['event'];
		if (!taskIdentifier.startsWith('OBS:')) continue;
		for (let requestedEvent of requestedEvents['tasks']) {
			requestedEvent = eventCheckValid(requestedEvent);
			if (
				Object.keys(requestedEvent).length == 0 ||
				requestedEvent.hasOwnProperty('matched') ||
				publishedEvent['event'].localeCompare(requestedEvent.summary)
			)
				continue;
			isEventSync = true;
			syncedObj['tasks'].push(publishedEvent['event'].slice('OBS: '.length));
			requestedEvent['matched'] = true;
		}
		if (!isEventSync) eventsDesync['tasks'].push(publishedEvent['id']);
	}
	return eventsDesync;
};

const listEventsMarkdown = async (address) => {
	var payload = {tasks: []};
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

const eventPublishMdToGc = async (auth, syncedObj) => {
	let validTaskObj = {},
		eventObj = {},
		publishedEvents = {events: []},
		syncedEvent = false;
	console.log(syncedObj);
	const calendar = google.calendar({version: 'v3', auth});

	let settings = await loadSavedSettings();
	let eventsToList = await listEventsMarkdown(settings['markdown_path']);
	for (const task of eventsToList['tasks']) {
		validTaskObj = eventCheckValid(task);
		if (validTaskObj === null || Object.keys(validTaskObj).length == 0) continue;
		for (const syncedObject of syncedObj['tasks']) {
			console.log(`${syncedObject} vs ${validTaskObj.summary}`);
			if (validTaskObj.summary.includes(syncedObject)) {
				syncedEvent = true;
				console.log('Synced: ' + validTaskObj.summary);
				break;
			}
		}
		if (syncedEvent) continue;
		console.log(eventObj);
		eventObj = {
			summary: validTaskObj.summary,
			start: validTaskObj.start,
			end: validTaskObj.end,
		};
		await calendar.events.insert({auth: auth, calendarId: 'primary', resource: validTaskObj}, (err, eventA) => {
			if (err) throw err;
		});
		publishedEvents['events'].push(eventObj);
	}
	return publishedEvents;
};

app.use(express.json());

app.get(
	'/events/list/googleCalendar',
	tryCatch(async (req, res) => {
		let error = {};
		const client = await authorize();
		const events = await listEventsGoogleCalendar(client);

		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write(JSON.stringify(events), 'utf8', 'Writing...');
		res.end();
		logApp(req, res, error, isDebugging, '');
	})
);

app.get(
	'/events/list/markdown',
	tryCatch(async (req, res) => {
		const settings = await loadSavedSettings();
		const md_address = settings['markdown_path'];
		const events = await listEventsMarkdown(md_address);
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write(JSON.stringify(events), 'utf8', 'Writing...');
		res.end();
		logApp(req, res, settings.error, isDebugging, '');
	})
);

app.get(
	'/events/sync',
	tryCatch(async (req, res) => {
		let syncedObj = {tasks: []},
			err = {},
			appResponse = 'Syncing Tasks';
		const auth = await authorize();
		const desync = await eventGetDesync(auth, syncedObj);

		for (const eventIdDesynced of desync['tasks']) await eventDelete(auth, eventIdDesynced);
		const response = await eventPublishMdToGc(auth, syncedObj);
		console.log(response['events']);
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write(JSON.stringify(response), 'utf8', 'Writing...');
		res.end();

		//logApp(req, res, err, isDebugging, appResponse);
	})
);

app.get(
	'/settings/load',
	tryCatch(async (req, res) => {
		const settings = await prowrap(loadSavedSettings());
		if (settings.error || settings.data === undefined) {
			await SaveSettings();
			settings = await prowrap(loadSavedSettings());
		}
		if (settings.error) throw settings.error;
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write(JSON.stringify(settings.data), 'utf8', 'Writing...');
		res.end();
	})
);

app.post(
	'/settings/save',
	tryCatch(async (req, res) => {
		let mes = 'Saved Settings';
		let result = await SaveSettings(req.body);
		res.status(200).send(mes);

		logApp(req, res, isLogging, mes);
		return res.end();
	})
);

app.get(
	'/log-in',
	tryCatch(async (req, res) => {
		let appResponse = 'Logged-In';
		let credits = await loadSavedCredits();
		if (credits.data) return res.status(200).send(appResponse);
		credits = authorize();
		if (credits.error) throw error;
	})
);

app.post(
	'/log-out',
	tryCatch(async (req, res) => {
		let appResponse = 'Logged-Out';
		response = await prowrap(deauthorize());
		res.status(200).send(appResponse);
		logApp(req, res, response.error, isLogging, appResponse);
	})
);

app.post(
	'/client/save',
	tryCatch(async (req, res) => {
		console.log(req.url)
		const url = new URLSearchParams(req.url);
		const fileName = url.get('/client/save?filename')
		console.log("File Name: " + fileName);
		req.on('data', chunk =>{
			fs.appendFileSync(path.join(pathDATABS, fileName), chunk);
		})
		res.status(200).send('received');
		logApp(req, res, isLogging, '');
	})
);

app.use(errorHandler);

export default app;
