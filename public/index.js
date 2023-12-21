const http = require('http');
const url = require('url');
const fs = require('fs');
const pathLocal = require('path');
const process = require('process');   

const lookup = require("mime-types").lookup;

const server = http.createServer((req, res) => {
  let parsedURL = url.parse(req.url, true);
  let path = parsedURL.path.replace(/^\/+|\/+$/g, "");
  if (path == "") {
    path = "index.html";
  }
  console.log('Requested path:', path);

  let file = pathLocal.join(pathLocal.join(pathLocal.dirname(process.cwd()),'public'), 'pages\\') + path; //search system should be implemented.

    fs.readFile(file, function(err, content) {
      if (err) {
        console.log('File Not Found', err);
        res.writeHead(404);
        res.end();

      } else {
        console.log('Returning', path);
        res.setHeader("X-Content-Type-Options", "nosniff");
        let mime = lookup(path);
        res.writeHead(200, {"Content-type": mime});
        res.end(content);
      }
    });
});

server.listen(1234, "localhost", () => {
  console.log("Listening on Port 1234");
})