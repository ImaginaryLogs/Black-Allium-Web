import express from "express";
import * as fs from 'fs';
import * as http from 'http';
import * as mimetype from 'mime-types';
import * as pathLocal from 'path';
import * as ps from 'process';
import * as url from 'url';

/**Own Modules**/
import app from './app.js';

const port = 8080;
const PUBLIC_PATH = ps.cwd();


function fileSearch(parentFolder, target){
  fs.readdir(parentFolder, function(err, content) {
    if (err){
      console.error(err);
      return False;
    } else {
      console.log("Content:", content);
      return content;
    }
  })
}

// const server = http.createServer((req, res) => {
//   let parsedURL = url.parse(req.url, true);
//   console.log("parsedURL:", parsedURL);
//   let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
//   if (path == "") {
//     path = "public/pages/index.html";
//   }
//   console.log('Requested path:', path);

//   //fileSearch(PUBLIC_PATH, path);

//   let file = pathLocal.join(pathLocal.dirname(ps.cwd()), path); //search system should be implemented.

//     fs.readFile(file, function(err, content) {
//       if (err) {
//         console.log('File Not Found', err);
//         res.writeHead(404);
//         res.end();
//       } else {
//         console.log('Returning', path);
//         res.setHeader("X-Content-Type-Options", "nosniff");
//         let mime = mimetype.lookup(path);
//         res.writeHead(200, {"Content-type": mime});
//         res.end(content);
//       }
//     });
// });

const server = express();

server.listen(port, "localhost", () => {
  console.log("Listening on Port", port);
})


server.use('/app', app);

//
server.use('/app', (req, res) => {
  let parsedURL = url.parse(req.url, true);
  console.log("GET-PUB,", parsedURL.path);
  server.use(app);
  console.log("Res: Not in domain");
  res.end();
});


server.use('/public/', (req, res) => {
  let parsedURL = url.parse(req.url, true);
  // console.log("parsedURL:", parsedURL);
  let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
  if (path == "") {
    path = "./public/pages/index.html";
  }
  console.log('GET-PUB,', path);

  let file = pathLocal.join(pathLocal.join(pathLocal.dirname(ps.cwd()), '/public/'), path); //search system should be implemented.
    fs.readFile(file, function(err, content) {
      if (err) {
        console.log('Err: File Not Found', err);
        res.writeHead(404);
        res.end();
      } else {
        console.log('Res:', path);
        res.setHeader("X-Content-Type-Options", "nosniff");
        let mime = mimetype.lookup(path);
        res.writeHead(200, {"Content-type": mime});
        res.end(content);
      }
    })}
)




