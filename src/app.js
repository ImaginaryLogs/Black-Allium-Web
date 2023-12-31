import { authenticate } from '@google-cloud/local-auth'; //  Authentication server processes
import * as express from 'express';
import * as fs from 'fs';
import * as fsp from 'fs/promises'; //  File system module
import { google } from 'googleapis'; //  Google API module
import * as path from 'node:path'; //  File Path module
import * as process from 'node:process'; //  Process is a native Node.js module that provides info and control over current process.
import * as readline from 'node:readline';
import logger from './errorHandling.js';

const urlScope = ['https://www.googleapis.com/auth/calendar'];
const pathClient = path.join(path.dirname(process.cwd()), 'client');
const pathCredit = path.join(pathClient, 'client_secrets.json');
const pathSetins = path.join(pathClient, 'client_settings.json')            
const pathTOKENS = path.join(pathClient, 'token.json');               // Token is a generated id that automatically does authentication.

const regDateYMD = /^\d{4}-\d{2}-\d{2}$/;
const emojiStart = '🛫';
const emojiEnd = '📅';
const emojiSched = '⏳'
const emojiDone = '✅'

const app = express.Router();
const port = 8081;
const isReveal = true;

// "markdown_path":"D:\\Extra Files\\Maynila Repository\\Port for Desktop\\Manila Manuscripts\\01 HOME\\Tasks.md",




const loadSavedSettings = async () => {
  try {
    var content = await fsp.readFile(pathSetins);
    return Promise.resolve(JSON.parse(content));
  } catch(err) {
    return Promise.reject(err);
  }
}

const SaveSettings = async (newInfo) => {
  let payloadSettings = {};
  loadSavedSettings()
  .then(async (response) => {
    const updatedKeys = Object.keys(newInfo);
    payloadSettings = response;
    for (let i = 0; i < updatedKeys.length; i++) {
      payloadSettings[updatedKeys[i]] = newInfo[updatedKeys[i]]
    }
    await fsp.writeFile(pathSetins, JSON.stringify(payloadSettings));
  })
  .catch(async (err) =>{
    payloadSettings = { "markdown_path":"", "web" : { "--bg":"#080808", "--text":"white" }}
    await fsp.writeFile(pathSetins, JSON.stringify(payloadSettings));
  })
}

/**
 * If by-pass token exist, it loads it in.
 * @return {Promise<OAuth2Client|null>} 
 */
const loadSavedCredits = async () => {
  try {
    const content = await fsp.readFile(pathTOKENS);  // Generate a async process that reads the file.
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);      // If it exists, return it.
  } catch (error) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
const saveNewCredits = async (client) => {
  const content = await fsp.readFile(pathCredit);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fsp.writeFile(pathTOKENS, payload);
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
    scopes: urlScope,
    keyfilePath: pathCredit,
  });
  console.log(client);
  if (client.credentials) {
    await saveNewCredits(client);
  }
  return Promise.resolve(client);
}

const deauthorize = async () => {
  const payload = JSON.stringify({
    type: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
  });
  await fsp.writeFile(pathTOKENS, payload);
}


class taskEvents {
  constructor(Summary, Start = "", End = ""){
    let utcNow = new Date();
    let utcTom = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1, 10, 0, 0));
    console.log(utcNow);
    console.log(utcTom);
    
    let utcStart = isValidDate(Start) ? new Date(Start) : utcNow();
    let utcEnd = isValidDate(End) ? new Date(End) : utcTom();
    this.summary = `OBS: ${Summary}`;
    this.start = {
      dateTime: utcStart,
      timeZone: "Asia/Manila"
    };
    this.end = {
      dateTime: utcEnd,
      timeZone: "Asia/Manila"
    };
  }
}

function isValidDate(dateString) {
  if(!dateString.match(regDateYMD)) return false;  
  let date = new Date(dateString);
  let dNum = date.getTime();
  if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return date.toISOString().slice(0,10) === dateString;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const listEventsGoogleC = async (auth) => {
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
  let data = {};
  let eventsList = [];
  let eventInfo = {};
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

const listEventsMarkdwn = async (address) => {
  var payload = { "tasks" : [] }
  const fileStream = fs.createReadStream(address);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  for await (const line of rl){
    if (line.indexOf("- [") != -1){
      var taskToDo = line.substring(line.indexOf("- [") + 6)
      console.log(`${taskToDo}, ${line.indexOf("- [")}`);
      payload["tasks"].push(taskToDo);
    }
  }
  console.log(payload);
  return payload;
}

const eventCreate = (eventString) => {
  let dateType, dateIndex, validData;
  let minDate = eventString.length;
  let isValidDate = false;
  let dateParams = {
    "dateStart" : {
      "dateIndex" : eventString.indexOf(emojiStart),
      "dateYMD" : ""
    },
    "dateEnd" : {
      "dateIndex" : eventString.indexOf(emojiEnd),
      "dateYMD" : ""
    },
    "dateSched" : {
      "dateIndex" : eventString.indexOf(emojiSched),
      "dateYMD" : ""
    },
    "dateDone" : {
      "dateIndex" : eventString.indexOf(emojiDone),
      "dateYMD" : ""
    }
  }
  
  for (const [dateType, dateObject] of Object.entries(dateParams)) {
    let stringIndex = dateObject["dateIndex"]
    if (stringIndex != -1) {
      isValidDate = true;
      let dateYMD = eventString.substring(stringIndex).substring(2, 13).replace(/^\s+|\s+$/gm,'');
      minDate = (stringIndex < minDate) ? stringIndex : minDate;
      dateObject["dateYMD"] = dateYMD;
    }
  }

  let utcNow = new Date();

  if (!isValidDate ||   
      dateParams["dateDone"]["dateIndex"] != -1 ||
      (new Date(dateParams["dateEnd"]["dateYMD"]).getTime() < utcNow.getTime())
      ) 
  {
    return {};
  }

  let summary = eventString.substring(0, minDate).replace(/^\s+|\s+$/gm,'');
  
  if (dateParams["dateStart"]["dateIndex"] != -1 || dateParams["dateEnd"]["dateIndex"] != -1){
    validData = new taskEvents(summary, dateParams["dateStart"]["dateYMD"], dateParams["dateEnd"]["dateYMD"]);
  }
  return validData;
}

const eventDelete = async () => {

}

const eventPublishMdToGc = async (auth) => {
  let taskObj = {}, eventObj = {};
  const calendar = google.calendar({version: 'v3', auth});

  await loadSavedSettings()
  .then(async (settings) => {
    const md_address = settings["markdown_path"];
    return await listEventsMarkdwn(md_address);
  })
  .then(async (eventsToList) => {
    console.log(eventsToList);
    for (const line of eventsToList["tasks"]){
      taskObj = eventCreate(line);
      if (Object.keys(taskObj).length !== 0) {
        eventObj = {
          'summary' : taskObj.summary,
          'start' : taskObj.start,
          'end' : taskObj.end
        }
        let data = await calendar.events.insert(
          {
            auth: auth,
            calendarId: 'primary',
            resource: taskObj
          },
          (err, eventA) => {
            if (err) {
              console.error("Error in Calendar Service." + err)
              console.error(err)
              return
            }
          console.log('Event created: %s', eventA); 
          }
        )
        return new Promise((res)=>{
          Reject(data);
        })
      }

    }
  })
  .catch(err => {
    console.error(err);
    return new Promise((err)=>{
      Reject(err);
    })
  })
}

app.use(express.json());

app.use(express.urlencoded());

app.get('/', (req, res) =>{
  console.log("GET-APP, Received");
})

app.get('/listEvents', (req, res) => {
  let error = {}
  authorize()
  .then(async (client) => {
    var object = await listEventsGoogleC(client);
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

app.get('/MdToGcEvents', async (req, res) =>{
  let error = {}
  authorize()
  .then(async (client) =>{
    let response = await eventPublishMdToGc(client);
    console.log(response.body);
    res.writeHead(200);
    res.end();
  })
  .catch(err =>{
    error = err
    res.writeHead(404);
    res.end()
  })
  logger(req, res, error, isReveal, "")
})

app.get('/loadSettings', async (req, res) => {
  var appResponse = "Loaded Settings"
  let error = {}
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

app.get('/mdList', async (req, res) => {
  await loadSavedSettings()
  .then(async (settings) => {
    const md_address = settings["markdown_path"];
    await listEventsMarkdwn(md_address)
    .then((object)=>{
      res.writeHead(200, {"Content-Type": "application/json"});
      res.write(JSON.stringify(object), 'utf8', "Writing...");
      res.end();
    })
    .catch((err) => {
      error = err
      res.writeHead(404);
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

app.post('/saveSettings', (req, res) =>{
  let appResponse = "Saved Settings"
  SaveSettings(req.body);
  res.writeHead(200)
  res.write(appResponse)
  res.end();
  logger(req, res, "", isReveal, appResponse);
});

app.delete('/signOut', (req, res) => {

})
export default app;