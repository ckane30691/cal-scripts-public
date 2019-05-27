const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const moment = require("moment");
const {
  getBlocks,
  pickBlocks,
  logAndComfirm,
  inviteAll,
  question,
  appendFile
} = require("./helpers");
const emails = require("./emailsToInvite");

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets"
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

function runWithAuth(fn) {
  debugger
  return new Promise((resolve, reject) => {
    // Load client secrets from a local file.
    fs.readFile("credentials.json", (err, content) => {
      if (err) return console.log("Error loading client secret file:", err);
      // Authorize a client with credentials, then call the Google Calendar API.
      authorize(JSON.parse(content), fn.bind(null, resolve));
    });
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
        console.log("Please run the script again");
      });
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function getSchedule(resolver, auth) {
  const startingWeek = parseInt(
    await question(`Begin "X" weeks from last sunday...\n`)
  );
  const duration = parseInt(
    await question(`Spread meetings across "X" weeks...\n`)
  );
  const calendar = google.calendar({ version: "v3", auth });
  calendar.events.list(
    {
      calendarId: "primary",
      timeMin: moment()
        .add(startingWeek, "week")
        .startOf("week")
        .toDate(),
      timeMax: moment()
        .add(startingWeek + duration, "week")
        .endOf("week")
        .toDate(),
      maxResults: 1000,
      singleEvents: true,
      orderBy: "startTime"
    },
    (err, res) => {
      if (err) return err;
      const events = res.data.items;
      resolver({
        events,
        startingWeek: moment()
          .add(startingWeek, "week")
          .startOf("week")
          .toDate(),
        duration,
        auth
      });
    }
  );
}

async function getSchedulePreset(startingWeek, duration, resolver, auth) {
  const calendar = google.calendar({ version: "v3", auth });
  calendar.events.list(
    {
      calendarId: "primary",
      timeMin: moment()
        .add(startingWeek, "week")
        .startOf("week")
        .toDate(),
      timeMax: moment()
        .add(startingWeek + duration, "week")
        .endOf("week")
        .toDate(),
      maxResults: 1000,
      singleEvents: true,
      orderBy: "startTime"
    },
    (err, res) => {
      if (err) return err;
      const events = res.data.items;
      resolver({
        events,
        startingWeek: moment()
          .add(startingWeek, "week")
          .startOf("week")
          .toDate(),
        duration,
        auth
      });
    }
  );
}

async function confirmAndSend(events, weeksToSchedule, auth) {
  const blocks = getBlocks(events, weeksToSchedule);
  let { output, studentsRemaining, blocksRemaining } = pickBlocks(
    emails,
    blocks
  );
  const shouldSend = await logAndComfirm({
    output,
    studentsRemaining,
    blocksRemaining
  });
  if (shouldSend) {
    const responses = await inviteAll(output, auth);
    console.log(responses);
    const success = await appendFile(responses, "./apiResponses.json");
    return true;
  }
  return false;
}

function insertEvent(auth) {
  var event = {
    summary: "Google I/O 2015",
    location: "800 Howard St., San Francisco, CA 94103",
    description: "A chance to hear more about Google's developer products.",
    start: {
      dateTime: "2019-05-15T17:30:00-07:00",
      timeZone: "America/Los_Angeles"
    },
    end: {
      dateTime: "2019-05-15T18:00:00-07:00",
      timeZone: "America/Los_Angeles"
    },
    recurrence: ["RRULE:FREQ=DAILY;COUNT=1"],
    attendees: [{ email: "lpage@example.com" }, { email: "sbrin@example.com" }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 10 }
      ]
    }
  };

  const calendar = google.calendar({ version: "v3", auth });
  calendar.events
    .insert({
      calendarId: "primary",
      resource: event
    })
    .then(
      function(response) {
        // Handle the results here (response.result has the parsed body).
        console.log("Response", response);
      },
      function(err) {
        console.error("Execute error", err);
      }
    );
}

module.exports = {
  confirmAndSend,
  runWithAuth,
  getSchedulePreset,
  getSchedule
};
