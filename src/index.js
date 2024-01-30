import cookieParser from 'cookie-parser';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import * as mongo from 'mongoose';
import * as path from 'path';
import * as ps from 'process';
import { LOG_INDEX } from './config/settings.js';
import { errorHandler, logApp, tries } from './middleware/middleware.js';
import api from './routes/api.js';

const pathClient = path.join(process.cwd(), '/client')
const pathCredit = path.join(pathClient, 'client_secrets.json');
const databaseURI = 'mongodb://localhost/8080';
const port = 8080;
const PATH_ROOT = ps.cwd();
const server = express();

server.use(express.json())
server.use(cookieParser());

// const checkAuthenticated = async (req, res, next) => {
//     let token = req.cookies['session-token'];
//     let user = {};

//     const verify = async () => {
// 		const ticket = await client.verifyIdToken({
// 			idToken: token,
// 			audience: CLIENT_ID
// 		})
// 		const payload = ticket.getPayload();
// 		user.name = payload.name;
// 		user.email = payload.email;
// 		user.picture = payload.picture;
// 	}
// 	verify()
// 	.then(()=>{
// 		req.user = user;
// 		next();
// 	})
// 	.catch((err)=>{
// 		res.redirect('/login')
// 	})
// }


server.listen(port, 'localhost', () => {
	console.log(`Listening on Port ${port}\nWebsite: http://localhost:${port}/`);
});

server.use('/api', api);

server.use('/app', express.static('app'));

server.use(`/public`, express.static('public'));

server.use(`/login`, (req, res) => {
	res.sendFile('login.html', { root: path.join(PATH_ROOT, 'public//pages//') });
	logApp(req, res, LOG_INDEX, '');
});

server.use(`/googletest`,  tries(async (req, res) =>{
	const auth = new google.auth.GoogleAuth({
		keyFile: "./src/client_secrets.json",
		scopes: 'https://www.googleapis.com/auth/calendar',
	})
	const client = await auth.getClient();
	const calendar = google.calendar({ version: 'v3', auth: client});
	const response = await calendar.events.list({
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
	res.sendHeaders(200);
}))

server.use('/', (req, res) => {
	res.sendFile('index.html', { root: path.join(PATH_ROOT, 'public//pages//') });
	logApp(req, res, LOG_INDEX, '');
});

server.use(errorHandler);
