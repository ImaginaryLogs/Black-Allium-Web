
// const process = require('process');
import { authenticate } from '@google-cloud/local-auth'; //  Authentication server processes
import { rejects } from 'assert';
import * as express from 'express';
import * as fs from 'fs/promises'; //  File system module
import { google } from 'googleapis'; //  Google API module
import * as path from 'path'; //  File Path module
import * as process from 'process'; //  Process is a native Node.js module that provides info and control over current process.
import { stringify } from 'querystring';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const CLIENT_PATH = path.join(path.dirname(process.cwd()), 'client');
const CREDENTIALS_PATH = path.join(CLIENT_PATH, 'client_secrets.json');
const TOKEN_PATH = path.join(CLIENT_PATH, 'token.json');  
const SETTINGS_PATH = path.join(CLIENT_PATH, 'client_settings.json')            // Token is a generated id that automatically does authentication.
const app = express.Router();
const port = 8081;
// "markdown_path":"D:\\Extra Files\\Maynila Repository\\Port for Desktop\\Manila Manuscripts\\01 HOME\\Tasks.md",
const loadSavedSettings = async () => {
  try{
    var content = await fs.readFile(SETTINGS_PATH);
    return Promise.resolve(JSON.parse(content));
  }
  catch(error) 
  {
    return Promise.reject();
  }
}

const SaveSettings = async (newContent) => {
  var oldContent = await loadSavedSettings();
  var updatedKeys = Object.keys(newContent);
  for (var i = 0; i < updatedKeys.length; i++){
    oldContent[updatedKeys[i]] = newContent[updatedKeys[i]]
  }
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(oldContent));
}



/**
 * If by-pass token exist, load it in.
 * @return {Promise<OAuth2Client|null>} 
 */
const loadSavedCredits = async () => {
  try {
    const content = await fs.readFile(TOKEN_PATH);  // Generate a async process that reads the file.
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
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
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
const listEvents = async (auth) => {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
 
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return Promise().reject();
  }

  console.log('Upcoming 10 events:');
  var data = {}
  var eventsList = [];
  var eventObj = {}
  events.map((event, i) => {
    eventObj = {}
    const start = event.start.dateTime || event.start.date;
    
    console.log(`${i}) ${start} - ${event.summary}`);
    eventObj["item"] = String(i);
    eventObj["date"] = String(start);
    eventObj["event"] = event.summary;
    eventsList.push(eventObj);
  });
  data["events"] = eventsList;
  return new Promise((resolve, reject) => {
    resolve(data);
  });
}

function logger(request, data, isSuccess, err){
  console.log("\u001b[1;33m"+"GET-APP", "\u001b[0;15m" + request);
  if (isSuccess)
  {
    console.log("\u001b[0;32m"+" \\->RES:", "\u001b[0;15m");
    console.log(data);
  } else
  {
    console.error(err);
  }
}

app.use(express.json());

app.use(express.urlencoded());

app.get('/', (req, res) =>{
  console.log("GET-APP, Received");
})



app.get('/listEvents', (req, res) => {

  
  authorize()
    .then(async (acquired) => {
      var object = await listEvents(acquired);
      logger('/listEvents', object, true, "")
      res.writeHead(200, {"Content-Type": "application/json"});
      res.write(JSON.stringify(object), 'utf8', "Writing...");
      res.end();
    })
    .catch(err => {
      logger('/listEvents', "", false, err)
      res.writeHead(404);
      res.end();
    });
    
});

app.post('/saveSettings', (req, res) =>{
  
  console.log(req.body);
  SaveSettings(req.body);
  res.writeHead(200)
  res.end();
  logger("/saveSettings", req.body, true, "");
});

app.get('/loadSettings', async (req, res) => {
  var object = await loadSavedSettings();
  res.writeHead(200, {"Content-Type": "application/json"});
  res.write(JSON.stringify(object), 'utf8', "Writing...");
  res.end();
  logger("/loadSettings", object, true, "");
})


export default app;