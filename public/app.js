const fs = require('fs').promises;                          //  File system module
const path = require('path');                               //  File Path module
const process = require('process');                         //  Process is a native Node.js module that provides info and control over current process.
const {authenticate} = require('@google-cloud/local-auth'); //  Authentication server processes
const {google} = require('googleapis');                     //  Google API module
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const CLIENT_PATH = path.join(path.dirname(path.dirname(process.cwd())), 'client');
const CREDENTIALS_PATH = path.join(CLIENT_PATH, 'client_secrets.json');
const TOKEN_PATH = path.join(CLIENT_PATH, 'token.json');               // Token is a generated id that automatically does authentication.

/**
 * If by-pass token exist, load it in.
 * @return {Promise<OAuth2Client|null>} 
 */
async function loadSavedCredits(){
  try {
    const content = await fs.readFile(TOKEN_PATH);  // Generate a async process that reads the file.
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);       // If it exists, return it.
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
async function saveCredits(client){
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
async function authorize() {
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
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
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
    return;
  }
  console.log('Upcoming 10 events:');
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    console.log(`${start} - ${event.summary}`);
  });
}