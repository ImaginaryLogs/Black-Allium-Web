import { authenticate } from '@google-cloud/local-auth';
import cookieParser from "cookie-parser";
import express, { Application, Express, Request, Response } from "express";
import * as fs from 'fs';
import * as fsp from 'fs/promises'; //  File system module
import { Auth, google } from 'googleapis';
import { oauth2 } from 'googleapis/build/src/apis/oauth2/index.js';
import * as path from 'node:path'; //  File Path module
import * as process from 'node:process'; //  Process is a native Node.js module that provides info and control over current process.
import * as readline from 'node:readline';
import * as proc from 'process';
import * as def from '../etc/types.mjs';
import { apiError } from '../middleware/apiError.mjs';
import { error_handler, get_result, log_actions, Some, try_log, try_redirect } from "../middleware/midwares.mjs";
import { GetOAuthCookies, GetOAuthURL, OAuth2Client } from "./google_credit_handler.mjs";


// ### PATHS ###
const PATH_CLIENT       : string = path.join(process.cwd(), 'src/client');
const PATH_CREDIT       : string = path.join(PATH_CLIENT, 'client_secrets.json');
const PATH_TOKENS       : string = path.join(PATH_CLIENT, 'token.json'); // Token is a generated id that automatically does authentication.
const PATH_SETTINGS     : string = path.join(PATH_CLIENT, 'client_settings.json');
const PATH_DATABASE     : string = path.join(path.dirname(process.cwd()), 'db');
const urlGoogleScope    : string[] = ['https://www.googleapis.com/auth/calendar'];
const regexDateYMD      : RegExp = /^\d{4}-\d{2}-\d{2}$/;

const api = express.Router();


const load_stored_settings = async (req: Request): Promise<any> =>{
    try {
        const content = req.cookies['user_settings'];
        return content;
    } catch (err: unknown) {
        return null;
    }
}

const save_settings = async (req: Request, newInfo: def.cookie_holder) => {
    let response = await get_result(load_stored_settings(req));
    
    // Default settings loaded.
    let payloadSettings: def.cookie_holder = def.default_setting;

	if (response.ok) {
		payloadSettings = response.value;
		for (const updatedKey of Object.keys(newInfo)) 
            payloadSettings[updatedKey] = newInfo[updatedKey];
	}
    
	return payloadSettings;
}


/**
 * Loads any OAuth2Client Credentials from Requesting CLient
 * @param req ${Request} Requests
 * @returns authorized credits to use.
 */
const load_stored_credits = (req: Request): Auth.OAuth2Client | null => {
    var credentials: def.cookie_holder = def.default_credits
    try {
        console.log(`Cookies: ${req.cookies}`);

        for (const cookie_name in req.cookies)
            credentials[cookie_name] = req.cookies[cookie_name];

        console.log(credentials);
        OAuth2Client.setCredentials(credentials);
        return OAuth2Client
    } catch (err: unknown){
        console.log(err)
        console.error(err);
        return null;
    }
}

interface event_info_type {
    'item'      : string
    'event_title'     : string,
    'event_description' : string,
    'date_start': string,
    'date_end'  : string,
    'id'        : string,
}

const default_event_info = {
    'item'      : '',
    'event_title': '',
    'event_description': '',
    'date_start': '',
    'date_end'  : '',
    'id'        : ''
}

/**
 * List Any events on Google Calendar
 * @param res 
 * @param authorized_client 
 * @returns 
 */
const list_events_on_calendar = async (res: Response, authorized_client: Auth.OAuth2Client) => {
    const calendar_access = google.calendar({version: "v3", auth: authorized_client});
    google.options(authorized_client);

    const cal_service_response = await calendar_access.events.list({
		calendarId: 'primary',
		timeMin: new Date().toISOString(),
		maxResults: 50,
		singleEvents: true,
		orderBy: 'startTime',
	});

    const calendar_events = cal_service_response.data.items

    let event_point : event_info_type;
    let event_list  : event_info_type[] = [default_event_info];
    let event_envalope: { events: event_info_type[] } = { events: [] };
    let datetime_start: string, datetime_end: string; 

    // ### Event Processing
    if (!calendar_events || calendar_events.length === 0) {
        console.log('None');
        return event_envalope;
    } else 
        calendar_events.map((event_data, index) => {
        // ### reset information to the next point ###
        event_point = default_event_info;
        datetime_start = event_data.start?.dateTime as string || event_data.start?.date as string;
        datetime_end   = event_data.end?.dateTime as string || event_data.end?.date as string;
        // ### add important details of the event ###
        event_point = {
            item        : String(index),
            event_title : event_data.summary as string,
            event_description       : event_data.description as string,
            date_start  : String(datetime_start),
            date_end    : String(datetime_end),
            id          : event_data.id as string,
        }
        event_list.push(event_point);
    })
    event_envalope['events'] = event_list;
    console.table(event_envalope['events'])
    return event_envalope
}   

const list_events_on_markdown = async (address: string) => {
    var tasks_payload: { [tasks: string]: string[] } = {tasks: []};
	const fileStream = fs.createReadStream(address);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});
	for await (const line of rl) {
		if (line.indexOf('- [') == -1) continue;
		var taskToDo = line.substring(line.indexOf('- [') + 6);
		tasks_payload['tasks'].push(taskToDo);
	}
	// console.log(payload);
	return tasks_payload;
}

api.use(express.json());
api.use(cookieParser());

api.post('/login', try_redirect(GetOAuthURL));

api.get('/settings/update', try_redirect(async (req: Request, res:Response) => {
    res.cookie('user_settings', save_settings(req, req.body));
    res.writeHead(200);
    res.send();
}));

api.get('/events/list/googleCalendar', try_redirect(async (req: Request, res: Response) => {
		const client = load_stored_credits(req)

		if (client == null) 
            throw new apiError("NO_INTERNET_ACCESS", "Server must be connected to the net.", "");

		const events = await (list_events_on_calendar(res, client));

		if (events == null) 
            throw new apiError("NO_INTERNET_ACCESS", "Server must be connected to the net.", "");

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(events), 'utf8');
		res.end();
	})
);

api.get(
	'/events/list/markdown', try_redirect(async (req: Request, res: Response) => {
		const settings = await load_stored_settings(req);
        console.log(`${settings}`);
        console.table(settings);
		const result_MarkdownAddress = await get_result(settings['markdown_path']);
        const events: { [tasks: string]: string[] } = {tasks: []};
        if (result_MarkdownAddress.ok){
    		const events = await list_events_on_markdown(result_MarkdownAddress.value as string);
        } else {
            throw new apiError("NO_MARKDOWN_ADDRESS", "Please input a markdown address");
        }

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(events), 'utf8');
		res.end();
	})
);

export default api;