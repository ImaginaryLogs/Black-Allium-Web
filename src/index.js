import express from "express";
import * as fs from 'fs';
import * as http from 'http';
import * as mimetype from 'mime-types';
import * as pathLocal from 'path';
import * as ps from 'process';
import * as url from 'url';

/**Own Modules**/
import app from './app.js';
import logger from './errorHandling.js';
const port = 8080;
const PUBLIC_PATH = pathLocal.dirname(ps.cwd());
const isReveal = false;
const server = express();

server.listen(port, "localhost", () => {
  console.log("Listening on Port", port);
});

server.use('/app', app);

server.use('/public', (req, res) => {

  
})

server.use('/', (req, res) => {
  let parsedURL = url.parse(req.url, true);
  let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
  if (path == "") {
    path = "./pages/index.html";
  }

  let file = pathLocal.join(pathLocal.join(PUBLIC_PATH, '/public/'), path);
  var error = {};
  fs.readFile(file, function(err, content) {
    if (err) {
      error = err;
      res.writeHead(404);
      res.end();
    } else {
      
      res.setHeader("X-Content-Type-Options", "nosniff");
      let mime = mimetype.lookup(path);
      res.writeHead(200, {"Content-type": mime});
      
      res.end(content);
    }
    logger(req, res, error, isReveal, "");
  })
})