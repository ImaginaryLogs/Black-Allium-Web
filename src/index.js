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

function logger(path, isResolved, err)
{
  console.log("\u001b[1;33m"+"GET-PUB:", '\u001b[0;15m'+ path + '\u001b[0;15m');
  if(isResolved){
    console.log('\u001b[0;32m'+' \\->RES:', '\u001b[0;15m' + path);
  } else {
    console.error(err);
  }
}


const server = express();

server.listen(port, "localhost", () => {
  console.log("Listening on Port", port);
})


server.use('/app', app);

//
server.use('/app', (req, res) => {
  let parsedURL = url.parse(req.url, true);
  //console.log("GET-PUB,", parsedURL.path);
  server.use(app);
  //console.log("Res: Not in domain");
  res.end();
});


server.use('/', (req, res) => {
  let parsedURL = url.parse(req.url, true);
  // console.log("parsedURL:", parsedURL);
  let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
  if (path == "") {
    path = "./pages/index.html";
  }

  let file = pathLocal.join(pathLocal.join(pathLocal.dirname(ps.cwd()), '/public/'), path); //search system should be implemented.
    fs.readFile(file, function(err, content) {
      if (err) {
        logger(path, false, err);
        res.writeHead(404);
        res.end();
      } else {
        logger(path, true, "");
        res.setHeader("X-Content-Type-Options", "nosniff");
        let mime = mimetype.lookup(path);
        res.writeHead(200, {"Content-type": mime});
        res.end(content);
      }
    })}
)







