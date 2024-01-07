import { authenticate } from "@google-cloud/local-auth"; //  Authentication server processes
import * as express from "express";
import * as fs from "fs";
import * as fsp from "fs/promises"; //  File system module
import { google } from "googleapis"; //  Google API module
import * as path from "node:path"; //  File Path module
import * as process from "node:process"; //  Process is a native Node.js module that provides info and control over current process.
import * as readline from "node:readline";
import { logApp } from "./middleware.js";

const urlScope = ["https://www.googleapis.com/auth/calendar"];
const pathClient = path.join(process.cwd(), "client");
const pathCredit = path.join(pathClient, "client_secrets.json");
const pathSetins = path.join(pathClient, "client_settings.json");
const pathTOKENS = path.join(pathClient, "token.json"); // Token is a generated id that automatically does authentication.

const regDateYMD = /^\d{4}-\d{2}-\d{2}$/;
const regOBS = /OBS:/g;
const emojiStart = "🛫";
const emojiEnd = "📅";
const emojiSched = "⏳";
const emojiDone = "✅";

const app = express.Router();
const port = 8081;
const isReveal = true;

// "markdown_path":"D:\\Extra Files\\Maynila Repository\\Port for Desktop\\Manila Manuscripts\\01 HOME\\Tasks.md",

class taskEvents {
	constructor(Summary, Start = "", End = "") {
		let utcNow = new Date();
		let utcTom = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1, 10, 0, 0));
		let utcStart = isValidDate(Start) ? new Date(Start) : utcNow();
		let utcEnd = isValidDate(End) ? new Date(End) : utcTom();
		this.summary = `OBS: ${Summary}`;
		this.start = {
			dateTime: utcStart,
			timeZone: "Asia/Manila",
		};
		this.end = {
			dateTime: utcEnd,
			timeZone: "Asia/Manila",
		};
	}
}

const loadSavedSettings = async () => {
	try {
		var content = await fsp.readFile(pathSetins);
		return Promise.resolve(JSON.parse(content));
	} catch (err) {
		console.log(err);
		return Promise.reject(err);
	}
};

const SaveSettings = async (newInfo) => {
	let payloadSettings = {};
	try {
		let oldSettings = await loadSavedSettings();
		const updatedKeys = Object.keys(newInfo);
		payloadSettings = oldSettings;
		for (let i = 0; i < updatedKeys.length; i++) {
			payloadSettings[updatedKeys[i]] = newInfo[updatedKeys[i]];
		}

		await fsp.writeFile(pathSetins, JSON.stringify(payloadSettings));
	} catch (error) {
		payloadSettings = {
			markdown_path: "",
			web: { "--bg": "#080808", "--text": "white" },
		};
		await fsp.writeFile(pathSetins, JSON.stringify(payloadSettings));
	}
};

/**
 * If by-pass token exist, it loads it in.
 * @return {Promise<OAuth2Client|null>}
 */
const loadSavedCredits = async () => {
	let answer = {};
	await fsp
		.readFile(pathTOKENS)
		.then((content) => {
			let credentials = JSON.parse(content);
			let googleCredits = google.auth.fromJSON(credentials);
			answer = googleCredits;
		})
		.catch((err) => {
			console.log(err);
			answer = null;
		});
	return Promise.resolve(answer);
};

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
const saveNewCredits = async (client) => {
	const content = await fsp.readFile(pathCredit);
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: "authorized_user",
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	await fsp.writeFile(pathTOKENS, payload);
};

/**
 * Load or request or authorization to call APIs.
 *
 */
const authorize = async () => {
	let client = await loadSavedCredits();
	if (client) {
		return client;
	}
	client = await authenticate({
		scopes: urlScope,
		keyfilePath: pathCredit,
	});
	console.log(client);
	if (client.credentials) {
		await saveNewCredits(client);
	}
	return Promise.resolve(client);
};

const deauthorize = async () => {
	try {
		const payload = JSON.stringify({
			type: "",
			client_id: "",
			client_secret: "",
			refresh_token: "",
		});
		await fsp.writeFile(pathTOKENS, payload);
	} catch (error) {
		throw error;
	}
};

const isValidDate = (dateString) => {
	if (!dateString.match(regDateYMD)) return false;
	let date = new Date(dateString);
	let dNum = date.getTime();
	if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
	return date.toISOString().slice(0, 10) === dateString;
};
/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const listEventsGoogleCalendar = async (auth) => {
	const calendar = google.calendar({ version: "v3", auth });
	const res = await calendar.events.list({
		calendarId: "primary",
		timeMin: new Date().toISOString(),
		maxResults: 30,
		singleEvents: true,
		orderBy: "startTime",
	});

	const receivedData = res.data.items;
	if (!receivedData || receivedData.length === 0) {
		console.log("No upcoming events found.");
		return Promise().reject();
	}
	//console.log('Upcoming 30 events:');
	let data = {},
		eventsList = [],
		eventInfo = {};
	receivedData.map((event, i) => {
		eventInfo = {};
		const start = event.start.dateTime || event.start.date;
		const end = event.end.dateTime || event.end.date;
		//console.log(`${i}) ${start} - ${event.summary}, ${event.id}`);
		eventInfo["item"] = String(i);
		eventInfo["date"] = String(start);
		eventInfo["event"] = event.summary;
		eventInfo["dateEnd"] = String(end);
		eventInfo["id"] = event.id;
		eventsList.push(eventInfo);
	});
	data["events"] = eventsList;
	return new Promise((resolve, reject) => {
		resolve(data);
	});
};

const listEventsMarkdown = async (address) => {
	var payload = { tasks: [] };
	try {
		const fileStream = fs.createReadStream(address);
		const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		});
		for await (const line of rl) {
			if (line.indexOf("- [") != -1) {
				var taskToDo = line.substring(line.indexOf("- [") + 6);
				// console.log(`${taskToDo}, ${line.indexOf("- [")}`);
				payload["tasks"].push(taskToDo);
			}
		}
	} catch (err) {
		throw err;
	}
	// console.log(payload);
	return payload;
};

const eventCheckValid = (eventString) => {
	let dateType, dateIndex, validData;
	let minDate = eventString.length;
	let isValidDate = false;
	let dateParams = {
		dateStart: {
			dateIndex: eventString.indexOf(emojiStart),
			dateYMD: "",
		},
		dateEnd: {
			dateIndex: eventString.indexOf(emojiEnd),
			dateYMD: "",
		},
		dateSched: {
			dateIndex: eventString.indexOf(emojiSched),
			dateYMD: "",
		},
		dateDone: {
			dateIndex: eventString.indexOf(emojiDone),
			dateYMD: "",
		},
	};

	for (const [dateType, dateObject] of Object.entries(dateParams)) {
		let stringIndex = dateObject["dateIndex"];
		if (stringIndex != -1) {
			isValidDate = true;
			let dateYMD = eventString
				.substring(stringIndex)
				.substring(2, 13)
				.replace(/^\s+|\s+$/gm, "");
			minDate = stringIndex < minDate ? stringIndex : minDate;
			dateObject["dateYMD"] = dateYMD;
		}
	}

	let utcNow = new Date();

	if (!isValidDate || dateParams["dateDone"]["dateIndex"] != -1 || new Date(dateParams["dateEnd"]["dateYMD"]).getTime() < utcNow.getTime()) {
		return {};
	}

	let summary = eventString.substring(0, minDate).replace(/^\s+|\s+$/gm, "");

	if (dateParams["dateStart"]["dateIndex"] != -1 || dateParams["dateEnd"]["dateIndex"] != -1) {
		validData = new taskEvents(summary, dateParams["dateStart"]["dateYMD"], dateParams["dateEnd"]["dateYMD"]);
	}
	return validData;
};

const eventDelete = async (auth, eventId) => {
	try {
		const calendar = google.calendar({ version: "v3", auth });
		calendar.events.delete({
			calendarId: "primary",
			eventId: eventId,
		});
		return new Promise((resolve, reject) => {
			resolve(`Deleted:${eventId}`);
		});
	} catch (error) {
		return new Promise((resolve, reject) => {
			reject(error);
		});
	}
};

const eventGetDesync = async (auth, syncedObj) => {
	let isEventSync = false,
		pubEventSummary = "",
		eventsDesync = { tasks: [] };
	try {
		const settings = await loadSavedSettings();
		const requestedEvents = await listEventsMarkdown(settings["markdown_path"]);
		const publishedEvents = await listEventsGoogleCalendar(auth);
		for (const publishedEvent of publishedEvents["events"]) {
			isEventSync = false;
			let taskIdentifier = publishedEvent["event"];
			if (!taskIdentifier.startsWith("OBS:")) {
				continue;
			}
			//console.log(publishedEvent)
			for (let requestedEvent of requestedEvents["tasks"]) {
				requestedEvent = eventCheckValid(requestedEvent);
				if (Object.keys(requestedEvent).length == 0 || requestedEvent.hasOwnProperty("matched")) {
					continue;
				}
				//console.log(`\"${requestedEvent.summary}\" and \"${publishedEvent["event"]}\"`)
				if (!publishedEvent["event"].localeCompare(requestedEvent.summary)) {
					isEventSync = true;
					syncedObj["tasks"].push(publishedEvent["event"].slice("OBS: ".length));
					//console.log("Exact Match!");
					requestedEvent["matched"] = true;
				}
			}
			if (!isEventSync) {
				eventsDesync["tasks"].push(publishedEvent["id"]);
			}
		}
		//console.log(eventsDesync)
		return eventsDesync;
	} catch (error) {
		console.error(error);
		return Promise.reject(error);
	}
};

const eventPublishMdToGc = async (auth, syncedObj) => {
	let validTaskObj = {},
		eventObj = {},
		syncedEvent = false;
	const calendar = google.calendar({ version: "v3", auth });

	try {
		let settings = await loadSavedSettings();
		let eventsToList = await listEventsMarkdown(settings["markdown_path"]);
		for (const task of eventsToList["tasks"]) {
			validTaskObj = eventCheckValid(task);
			if (Object.keys(validTaskObj).length == 0) continue;
			for (const syncedObject of syncedObj["tasks"]) {
				if (validTaskObj.summary.localeCompare(syncedObject)) {
					syncedEvent = true;
					break;
				}
			}
			if (syncedEvent) {
				continue;
			}
			eventObj = {
				summary: validTaskObj.summary,
				start: validTaskObj.start,
				end: validTaskObj.end,
			};
			let data = await calendar.events.insert({ auth: auth, calendarId: "primary", resource: validTaskObj }, (err, eventA) => {
				if (err) {
					console.error("Error in Calendar Service." + err);
					console.error(err);
					return;
				}
			});
		}
	} catch (error) {
		console.error(error);
		return new Promise((error) => {
			Reject(error);
		});
	}
};

/**
 * API Responses
 */

app.use(express.json());

app.get("/events/list/googleCalendar", (req, res) => {
	let error = {};
	authorize()
		.then(async (client) => {
			const object = await listEventsGoogleCalendar(client);
			res.writeHead(200, { "Content-Type": "application/json" });
			res.write(JSON.stringify(object), "utf8", "Writing...");
			res.end();
		})
		.catch((err) => {
			error = err;
			logApp(req, res, error, isReveal, "");
			res.writeHead(404);
			res.end();
		});
});

app.get("/events/list/markdown", async (req, res) => {
	let error = {};
	await loadSavedSettings()
		.then(async (settings) => {
			const md_address = settings["markdown_path"];
			return await listEventsMarkdown(md_address);
		})
		.then((object) => {
			res.writeHead(200, { "Content-Type": "application/json" }).write(JSON.stringify(object), "utf8", "Writing...").end();
		})
		.catch((err) => {
			let message = "";
			error = err;
			if (err.errno == -4058) message = "Input the correct address of your markdown file! \n";
			res.status(400);
			res.write(message + err.toString());
			res.end();
		});
	logApp(req, res, error, isReveal, "");
});

app.get("/events/sync", async (req, res) => {
	let syncedObj = { tasks: [] },
		err = {},
		appResponse = "Syncing Tasks";
	authorize()
		.then((auth) => eventGetDesync(auth, syncedObj))
		.then(async (desync) => {
			for (const eventIdDesynced of desync["tasks"]) {
				await eventDelete(auth, eventIdDesynced);
			}
			return authorize();
		})
		.then(async (auth) => {
			let response = await eventPublishMdToGc(auth, syncedObj);
			console.log(response);
			res.writeHead(200);
			res.end();
		})
		.catch((error) => {
			res.status(400).send({ message: error.message });
		});
	logApp(req, res, err, isReveal, appResponse);
});

app.get("/settings/load", async (req, res) => {
	var appResponse = "Loaded Settings";
	let error = {};
	await loadSavedSettings()
		.then((settings) => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.write(JSON.stringify(settings), "utf8", "Writing...");
			res.end();
		})
		.catch(async (err) => {
			console.error(err);
			await SaveSettings();
			const settings = await loadSavedSettings();
			res.writeHead(200, { "Content-Type": "application/json" });
			res.write(JSON.stringify(settings), "utf8", "Writing...");
			res.end();
		});
	logApp(req, res, error, isReveal, appResponse);
});

app.post("/settings/save", (req, res) => {
	let err = {};
	let appResponse = "Saved Settings";
	SaveSettings(req.body)
		.then(() => {
			res.writeHead(200);
			res.write(appResponse);
			res.end();
		})
		.catch((err) => {
			res.writeHead(500);
			res.end();
		});
	logApp(req, res, err, isReveal, appResponse);
});

app.post("/log-in", async (req, res) => {
	let appResponse = "Logged-In";
	await loadSavedCredits()
		.then(async (data) => {
			if (data) {
				res.writeHead(200);
				res.write(appResponse);
				res.end();
			}
			return await authorize();
		})
		.then(() => {
			res.writeHead(200).send(appResponse);
			res.end();
		})
		.catch((err) => {
			res.status(500).end();
		});
});

app.post("/log-out", async (req, res) => {
	let appResponse = "Logged-Out";
	await deauthorize();
	res.status(200).send(appResponse);
	logApp(req, res, "", isReveal, appResponse);
});
export default app;
