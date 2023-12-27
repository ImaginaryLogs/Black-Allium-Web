
import { authenticate } from '@google-cloud/local-auth'; //  Authentication server processes
import * as express from 'express';
import * as fs from 'fs'
import * as fsp from 'fs/promises'; //  File system module
import { google } from 'googleapis'; //  Google API module
import * as path from 'node:path'; //  File Path module
import * as process from 'node:process'; //  Process is a native Node.js module that provides info and control over current process.
import logger from './errorHandling.js';
import * as readline from 'node:readline';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const CLIENT_PATH = path.join(path.dirname(process.cwd()), 'client');
const CREDENTIALS_PATH = path.join(CLIENT_PATH, 'client_secrets.json');
const SETTINGS_PATH = path.join(CLIENT_PATH, 'client_settings.json')            // Token is a generated id that automatically does authentication.
const TOKEN_PATH = path.join(CLIENT_PATH, 'token.json');
var app = express.Router();
const port = 8081;
const isReveal = true;

// "markdown_path":"D:\\Extra Files\\Maynila Repository\\Port for Desktop\\Manila Manuscripts\\01 HOME\\Tasks.md",

const loadSavedSettings = async () => {
  try {
    var content = await fsp.readFile(SETTINGS_PATH);
    return Promise.resolve(JSON.parse(content));
  } catch(err) {
    return Promise.reject(err);
  }
}

const SaveSettings = async (newInfo) => {
  var payloadSettings = {};
  loadSavedSettings()
  .then(async (response) => {
    var updatedKeys = Object.keys(newInfo);
    console.log(updatedKeys);
    console.log(response);
    payloadSettings = response;
    for (var i = 0; i < updatedKeys.length; i++) {
      payloadSettings[updatedKeys[i]] = newInfo[updatedKeys[i]]
      console.log(payloadSettings[updatedKeys[i]]);
    }
    await fsp.writeFile(SETTINGS_PATH, JSON.stringify(payloadSettings));
  }).catch(async (err) =>{
    payloadSettings = {
      "markdown_path":"",
      "web" : {
        "--bg":"#080808",
        "--text":"white"
      }
    }
    await fsp.writeFile(SETTINGS_PATH, JSON.stringify(payloadSettings));
  })
}

/**
 * If by-pass token exist, it loads it in.
 * @return {Promise<OAuth2Client|null>} 
 */
const loadSavedCredits = async () => {
  try {
    const content = await fsp.readFile(TOKEN_PATH);  // Generate a async process that reads the file.
    const credentials = JSON.parse(content);
    return Promise.resolve(google.auth.fromJSON(credentials));       // If it exists, return it.
  } catch (error) {
    return Promise.reject();
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
const saveCredits = async (client) => {
  const content = await fsp.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fsp.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
const authorize = async () => {
  let client = await loadSavedCredits();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredits(client);
  }
  return Promise.resolve(client);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const gclistEvents = async (auth) => {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const receivedData = res.data.items;
  if (!receivedData || receivedData.length === 0) {
    console.log('No upcoming events found.');
    return Promise().reject();
  }
  console.log('Upcoming 10 events:');
  var data = {};
  var eventsList = [];
  var eventInfo = {};
  receivedData.map((event, i) => {
    eventInfo = {}
    const start = event.start.dateTime || event.start.date;
    console.log(`${i}) ${start} - ${event.summary}`);
    eventInfo["item"] = String(i);
    eventInfo["date"] = String(start);
    eventInfo["event"] = event.summary;
    eventsList.push(eventInfo);
  });
  data["events"] = eventsList;
  return new Promise((resolve, reject) => {
    resolve(data);
  });
}

const mdListEvents = async (address) => {
  var payload = {
    "tasks" : []
  }
  const fileStream = fs.createReadStream(address);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  for await (const line of rl){
    if (line.indexOf("- [") != -1){
      var taskToDo = line.substring(line.indexOf("- [") + 6);
      console.log(`${taskToDo}, ${line.indexOf("- [")}`);
      payload["tasks"].push(taskToDo);
    }
  }
  console.log(payload);
  return payload;
}

app.use(express.json());

app.use(express.urlencoded());

app.get('/', (req, res) =>{
  console.log("GET-APP, Received");
})

app.get('/listEvents', (req, res) => {
  var error = {}
  authorize()
  .then(async (acquired) => {
    var object = await gclistEvents(acquired);
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify(object), 'utf8', "Writing...");
    res.end();
  })
  .catch(err => {
    error = err
    res.writeHead(404);
    res.end();
  });
  logger(req, res, error, isReveal, "");
});

app.post('/saveSettings', (req, res) =>{
  var appResponse = "Saved Settings"
  SaveSettings(req.body);
  res.writeHead(200)
  res.write(appResponse)
  res.end();
  logger(req, res, "", isReveal, appResponse);
});

app.get('/loadSettings', async (req, res) => {
  let error = {}
  var appResponse = "Loaded Settings"
  await loadSavedSettings()
  .then((object)=>{
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify(object), 'utf8', "Writing...");
    res.end();
  })
  .catch(async (err) => {
    await SaveSettings()
    .then(async () => {await loadSavedSettings()})
    .then((object)=>{
      res.writeHead(200, {"Content-Type": "application/json"});
      res.write(JSON.stringify(object), 'utf8', "Writing...");
      res.end();
    }).catch((err)=>{
      error = err;
      res.writeHead(404);
      res.end();
    })
    
  });
  logger(req, res, error, isReveal, appResponse);
})

app.get('/mdList', async (req, res) =>{
  let error = {};
  await loadSavedSettings()
  .then(async (settings) => {
    const md_address = settings["markdown_path"];
    await mdListEvents(md_address)
    .then((object)=>{
      res.writeHead(200, {"Content-Type": "application/json"});
      res.write(JSON.stringify(object), 'utf8', "Writing...");
      res.end();
    })
  })
  .catch((err)=>{
    error = err
    res.writeHead(404);
    
    res.end();
  })
  logger(req,res,error,isReveal,"");
})

export default app;