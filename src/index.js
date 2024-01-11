import express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as mimetype from 'mime-types';
import * as pathLocal from 'path';
import * as ps from 'process';
import * as url from 'url';

import api from './routes/api.js';
import { logApp, errorHandler } from './middleware/middleware.js';
import { LOG_INDEX } from './config/settings.js';

const port = 8080;
const PATH_ROOT = process.cwd();
const server = express();

server.listen(port, 'localhost', () => {
	console.log(`Listening on Port ${port}\nWebsite: http://localhost:${port}/`);
});

server.use('/api', api);

server.use('/app', express.static('app'));

server.use(`/public`, express.static('public'));

server.use('/', (req, res) => {
	res.sendFile('index.html', { root: pathLocal.join(PATH_ROOT, 'public//pages//') });
	logApp(req, res, LOG_INDEX, '');
});

server.use(errorHandler);

//let parsedURL = url.parse(req.url, true);
// let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
// let file = pathLocal.join(pathLocal.join(PATH_ROOT, "app"), path);

// fs.readFile(file, (err, content) => {
// 	if (err) {
// 		res.writeHead(404);
// 		res.end();
// 	} else {
// 		res.setHeader("X-Content-Type-Options", "nosniff");
// 		let mime = mimetype.lookup(path);
// 		res.writeHead(200, { "Content-type": mime });
// 		res.end(content);
// 	}
// });
// logApp(req, res, LOG_INDEX, "");
