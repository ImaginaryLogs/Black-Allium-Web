import dotenv from "dotenv";

dotenv.config({});

import axios from 'axios';
import cookieParser from "cookie-parser";
import express, { application } from "express";
import { google } from 'googleapis';


const port = process.env.NODE_ENV||8080;
const server = express();


const OAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, 
    process.env.CLIENT_SECRET, 
    process.env.REDIRECT_URL
)

const scopes = [
    'https://www.googleapis.com/auth/calendar'
]
const cookieNames = [ 'access_token', 'refresh_token', 'scope', 'token_type', 'expiry_date']


server.use(cookieParser());

server.get("/google", tries(async (req,res)=>{
    const url = OAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
    })
    res.redirect(url);
}))

server.get("/readCr", tries((req,res)=>{
    console.log(OAuth2Client);
	var credentials = {}
	for(const cookieName of cookieNames){
		if (cookieName == "expiry_date")
		{
			credentials[cookieName] = Number(req.cookies[cookieName])
			continue;
		}
		credentials[cookieName] = req.cookies[cookieName];
	}
	console.log(credentials);
    
    res.writeHeader(200, { 'Content-Type': 'application/json' });
    res.write("Sending" + JSON.stringify(OAuth2Client));
    res.end();
}))

server.get("/google/redirect", tries(async (req, res) =>{
    const code = req.query.code;

    //const user_info = axios.get(`https://www.googleapis.com/oauth/v3/tokeninfo?id_token=${code}`);
    const { tokens } = await OAuth2Client.getToken(code)
    OAuth2Client.setCredentials(tokens)
    console.log("Tokens:\n");
    console.log(tokens);
	
	res.cookie('access_token', tokens.access_token, { maxAge: tokens.expiry_date, httpOnly: true });
	res.cookie('refresh_token', tokens.refresh_token, { maxAge: tokens.expiry_date, httpOnly: true });
	res.cookie('scope', tokens.scope, { maxAge: tokens.expiry_date, httpOnly: true });
	res.cookie('token_type', tokens.token_type, { maxAge: tokens.expiry_date, httpOnly: true });
	res.cookie('expiry_date', tokens.expiry_date, { maxAge: tokens.expiry_date, httpOnly: true })
	
    
    res.writeHeader(200);
    res.write("Logged In!" + JSON.stringify(OAuth2Client));
    res.end();
}))

server.get('/schedule_event', tries(async (req, res)=>{
    var credentials = {}
	for(const cookieName of cookieNames){
		if (cookieName == "expiry_date")
		{
			credentials[cookieName] = Number(req.cookies[cookieName])
			continue;
		}
		credentials[cookieName] = req.cookies[cookieName];
	}
	console.log(credentials);
	OAuth2Client.setCredentials(credentials)
    const calendar = google.calendar({ version: 'v3', auth: OAuth2Client });

	var response = await calendar.events.list({
		calendarId: 'primary',
		timeMin: new Date().toISOString(),
		maxResults: 100,
		singleEvents: true,
		orderBy: 'startTime',
	})
    
	const receivedData = response.data.items;
	if (!receivedData || receivedData.length === 0) {
		console.log('No upcoming events found.');
		return { events: '' };
	}
	var eventsList = [];
	receivedData.map((event, i) => {
		var eventInfo = {};
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
	var data = {};
	data['events'] = eventsList;
	console.table(data['events']);

	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.write(JSON.stringify(data), 'utf8', 'Writing...');
	res.end();
}))













import { oauth2 } from "googleapis/build/src/apis/oauth2/index.js";
import * as path from 'path';
import * as ps from 'process';
import { LOG_INDEX } from './config/settings.js';
import { errorHandler, logApp, tries } from './middleware/middleware.js';
import api from './routes/api.js';

const pathClient = path.join(process.cwd(), '/client')
const pathCredit = path.join(pathClient, 'client_secrets.json');
const PATH_ROOT = ps.cwd();

server.listen(port, 'localhost', () => {
	console.log(`Listening on Port ${port}\nWebsite: http://localhost:${port}/`);
});

server.use('/api', api);

server.use('/app', express.static('app'));

server.use(`/public`, express.static('public'));

server.use('/', (req, res) => {
	res.sendFile('index.html', { root: path.join(PATH_ROOT, 'public//pages//') });
	logApp(req, res, LOG_INDEX, '');
});

server.use(errorHandler);