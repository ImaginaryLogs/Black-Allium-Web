import express from "express";
import * as fs from "fs";
import * as http from "http";
import * as mimetype from "mime-types";
import * as pathLocal from "path";
import * as ps from "process";
import * as url from "url";

/**Own Modules**/
import api from "./api.js";
import logger from "./errorHandling.js";
const port = 8080;
const PUBLIC_PATH = pathLocal.dirname(ps.cwd());
const isReveal = true;
const server = express();

server.listen(port, "localhost", () => {
	console.log("Listening on Port", port);
});

server.use("/api", api);

server.use("/app", (req, res) => {
  let error = {}
  let parsedURL = url.parse(req.url, true);
	let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
  let file = pathLocal.join(pathLocal.join(PUBLIC_PATH, "/app/"), path);
  fs.readFile(file, function (err, content) {
    if (err) {
			error = err;
			res.writeHead(404);
			res.end();
    } else {
      res.setHeader("X-Content-Type-Options", "nosniff");
      let mime = mimetype.lookup(path);
      res.writeHead(200, { "Content-type": mime });
      res.end(content);
    }
  })
  logger(req, res, error, isReveal, "");
});

server.use("/", (req, res) => {
	let parsedURL = url.parse(req.url, true);
	let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
	if (path == "") {
		path = "./pages/index.html";
	}

	let file = pathLocal.join(pathLocal.join(PUBLIC_PATH, "/public/"), path);
	let error = {};
	fs.readFile(file, function (err, content) {
		if (err) {
			error = err;
			res.writeHead(404);
			res.end();
		} else {
			res.setHeader("X-Content-Type-Options", "nosniff");
			let mime = mimetype.lookup(path);
			res.writeHead(200, { "Content-type": mime });
			res.end(content);
		}
		logger(req, res, error, isReveal, "");
	});
});
