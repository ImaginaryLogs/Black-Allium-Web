var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import cookieParser from "cookie-parser";
import express from "express";
import * as fs from 'fs';
import { google } from 'googleapis';
import * as path from 'node:path'; //  File Path module
import * as process from 'node:process'; //  Process is a native Node.js module that provides info and control over current process.
import * as readline from 'node:readline';
import * as def from '../etc/types.mjs';
import { apiError } from '../middleware/apiError.mjs';
import { get_result, try_redirect } from "../middleware/midwares.mjs";
import { GetOAuthURL, OAuth2Client } from "./google_credit_handler.mjs";
// ### PATHS ###
const PATH_CLIENT = path.join(process.cwd(), 'src/client');
const PATH_CREDIT = path.join(PATH_CLIENT, 'client_secrets.json');
const PATH_TOKENS = path.join(PATH_CLIENT, 'token.json'); // Token is a generated id that automatically does authentication.
const PATH_SETTINGS = path.join(PATH_CLIENT, 'client_settings.json');
const PATH_DATABASE = path.join(path.dirname(process.cwd()), 'db');
const urlGoogleScope = ['https://www.googleapis.com/auth/calendar'];
const regexDateYMD = /^\d{4}-\d{2}-\d{2}$/;
const api = express.Router();
const load_stored_settings = (req) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const content = req.cookies['user_settings'];
        return content;
    }
    catch (err) {
        return null;
    }
});
const save_settings = (req, newInfo) => __awaiter(void 0, void 0, void 0, function* () {
    let response = yield get_result(load_stored_settings(req));
    // Default settings loaded.
    let payloadSettings = def.default_setting;
    if (response.ok) {
        payloadSettings = response.value;
        for (const updatedKey of Object.keys(newInfo))
            payloadSettings[updatedKey] = newInfo[updatedKey];
    }
    return payloadSettings;
});
/**
 * Loads any OAuth2Client Credentials from Requesting CLient
 * @param req ${Request} Requests
 * @returns authorized credits to use.
 */
const load_stored_credits = (req) => {
    var credentials = def.default_credits;
    try {
        console.log(`Cookies: ${req.cookies}`);
        for (const cookie_name in req.cookies)
            credentials[cookie_name] = req.cookies[cookie_name];
        console.log(credentials);
        OAuth2Client.setCredentials(credentials);
        return OAuth2Client;
    }
    catch (err) {
        console.log(err);
        console.error(err);
        return null;
    }
};
const default_event_info = {
    'item': '',
    'event_title': '',
    'event_description': '',
    'date_start': '',
    'date_end': '',
    'id': ''
};
/**
 * List Any events on Google Calendar
 * @param res
 * @param authorized_client
 * @returns
 */
const list_events_on_calendar = (res, authorized_client) => __awaiter(void 0, void 0, void 0, function* () {
    const calendar_access = google.calendar({ version: "v3", auth: authorized_client });
    google.options(authorized_client);
    const cal_service_response = yield calendar_access.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
    });
    const calendar_events = cal_service_response.data.items;
    let event_point;
    let event_list = [default_event_info];
    let event_envalope = { events: [] };
    let datetime_start, datetime_end;
    // ### Event Processing
    if (!calendar_events || calendar_events.length === 0) {
        console.log('None');
        return event_envalope;
    }
    else
        calendar_events.map((event_data, index) => {
            var _a, _b, _c, _d;
            // ### reset information to the next point ###
            event_point = default_event_info;
            datetime_start = ((_a = event_data.start) === null || _a === void 0 ? void 0 : _a.dateTime) || ((_b = event_data.start) === null || _b === void 0 ? void 0 : _b.date);
            datetime_end = ((_c = event_data.end) === null || _c === void 0 ? void 0 : _c.dateTime) || ((_d = event_data.end) === null || _d === void 0 ? void 0 : _d.date);
            // ### add important details of the event ###
            event_point = {
                item: String(index),
                event_title: event_data.summary,
                event_description: event_data.description,
                date_start: String(datetime_start),
                date_end: String(datetime_end),
                id: event_data.id,
            };
            event_list.push(event_point);
        });
    event_envalope['events'] = event_list;
    console.table(event_envalope['events']);
    return event_envalope;
});
const list_events_on_markdown = (address) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var tasks_payload = { tasks: [] };
    const fileStream = fs.createReadStream(address);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    try {
        for (var _d = true, rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = yield rl_1.next(), _a = rl_1_1.done, !_a; _d = true) {
            _c = rl_1_1.value;
            _d = false;
            const line = _c;
            if (line.indexOf('- [') == -1)
                continue;
            var taskToDo = line.substring(line.indexOf('- [') + 6);
            tasks_payload['tasks'].push(taskToDo);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = rl_1.return)) yield _b.call(rl_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // console.log(payload);
    return tasks_payload;
});
api.use(express.json());
api.use(cookieParser());
api.post('/login', try_redirect(GetOAuthURL));
api.get('/settings/update', try_redirect((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.cookie('user_settings', save_settings(req, req.body));
    res.writeHead(200);
    res.send();
})));
api.get('/events/list/googleCalendar', try_redirect((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = load_stored_credits(req);
    if (client == null)
        throw new apiError("NO_INTERNET_ACCESS", "Server must be connected to the net.", "");
    const events = yield (list_events_on_calendar(res, client));
    if (events == null)
        throw new apiError("NO_INTERNET_ACCESS", "Server must be connected to the net.", "");
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(events), 'utf8');
    res.end();
})));
api.get('/events/list/markdown', try_redirect((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const settings = yield load_stored_settings(req);
    console.log(`${settings}`);
    console.table(settings);
    const result_MarkdownAddress = yield get_result(settings['markdown_path']);
    const events = { tasks: [] };
    if (result_MarkdownAddress.ok) {
        const events = yield list_events_on_markdown(result_MarkdownAddress.value);
    }
    else {
        throw new apiError("NO_MARKDOWN_ADDRESS", "Please input a markdown address");
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(events), 'utf8');
    res.end();
})));
export default api;
//# sourceMappingURL=api.mjs.map