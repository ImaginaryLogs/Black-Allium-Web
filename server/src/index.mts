//import cookieParser from "cookie-parser";
import style from 'ansi-styles';
import dotenv from "dotenv";
import express, { Express, NextFunction, Request, Response } from "express";
import { google } from 'googleapis';
import { oauth2 } from "googleapis/build/src/apis/oauth2/index.js";
import * as path from 'path';
import * as proc from 'process';
import { error_handler, isEnvPropertyExist, log_actions, try_log, try_redirect } from './middleware/midwares.mjs';
import api_app from './routes/api.mjs';
import credit from './routes/google_credit_handler.mjs';

// ### Global Configs #####
dotenv.config({});

// ### Global Variables ####
const PATH_ROOT		: string = proc.cwd();
const PATH_CLIENT	: string = path.join(PATH_ROOT, '/client')
const PATH_CREDIT	: string = path.join(PATH_CLIENT, 'client_secrets.json');
const port: number = Number(proc.env.PORT) || 8080;
const server: Express = express();


server.use('/api', api_app);

server.use('/google', credit);

server.use('/public', express.static(path.join(PATH_ROOT, '/public')));

server.get('/', (request: Request, response: Response) => {
	response.sendFile('index.html', { root: path.join(PATH_ROOT, 'public//pages//') });
	log_actions(request, response, {mes: `${path.join(PATH_ROOT, 'public//pages//')}`});
});

server.listen(port, 'localhost', () => {
	// ### Check the .env set-up ####
	const stats: String[] = [
		`[!Settings]: `,
		`  1. LOG_GENERAL \t${isEnvPropertyExist(proc.env.LOG_GENERAL)}`,
		`  2. LOG_ERROR \t${isEnvPropertyExist(proc.env.LOG_ERROR)}`,
		`  3. CLIENT_ID \t${isEnvPropertyExist(proc.env.CLIENT_ID)}`,
		`  4. CLIENT_SECRET\t${isEnvPropertyExist(proc.env.CLIENT_SECRET)}`,
		`  5. API_KEY \t${isEnvPropertyExist(proc.env.API_KEY)}`,
	]

	// ### Status Check ###
	console.log(`\nListening on Port ${port}!`);
	console.log(`Website: http://localhost:${port}/`);
	for (const stat_info of stats)
		console.log(stat_info);
});

server.use(try_log);	

server.use(error_handler);