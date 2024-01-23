import express from 'express';
import * as mongo from 'mongoose';
import * as path from 'path';
import * as ps from 'process';
import cookieParser from 'cookie-parser'
import api from './routes/api.js';
import { logApp, errorHandler, tries } from './middleware/middleware.js';
import { LOG_INDEX } from './config/settings.js';
import { OAuth2Client } from 'google-auth-library';

const pathClient = path.join(process.cwd(), '/client')
const pathCredit = path.join(pathClient, 'client_secrets.json');
const databaseURI = 'mongodb://localhost/8080';
const port = 8080;
const PATH_ROOT = ps.cwd();
const server = express();

server.use(express.json())
server.use(cookieParser());

const checkAuthenticated = async (req, res, next) => {
    let token = req.cookies['session-token'];
    let user = {};

    const verify = async () => {
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID
		})
		const payload = ticket.getPayload();
		user.name = payload.name;
		user.email = payload.email;
		user.picture = payload.picture;
	}
	verify()
	.then(()=>{
		req.user = user;
		next();
	})
	.catch((err)=>{
		res.redirect('/login')
	})
}


server.listen(port, 'localhost', () => {
	console.log(`Listening on Port ${port}\nWebsite: http://localhost:${port}/`);
});

server.use('/api', checkAuthenticated, api);

server.use('/app', express.static('app'));

server.use(`/public`, express.static('public'));

server.use(`/login`, (req, res) => {
	res.sendFile('login.html', { root: path.join(PATH_ROOT, 'public//pages//') });
	logApp(req, res, LOG_INDEX, '');
});

server.use('/', (req, res) => {
	res.sendFile('index.html', { root: path.join(PATH_ROOT, 'public//pages//') });
	logApp(req, res, LOG_INDEX, '');
});

server.use(errorHandler);
