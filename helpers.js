const moment = require("moment");
const { google } = require("googleapis");
const readline = require("readline");
const fs = require("fs");
const colors = require("colors");

function getBlocks(inputEventArr, weekCount = 1) {
  // console.log(inputEventArr)
  let extraWeekCount = weekCount - 1;
  const allPossible = [];
  let eventArr = JSON.parse(JSON.stringify(inputEventArr));
  eventArr = eventArr.filter(event => event.start.dateTime);
  const time = moment(eventArr[0].start.dateTime)
    .startOf("week")
    .add(1, "day")
    .add(9, "h");
  // .add(6, "h");
  for (let day = 0; day < 5 + extraWeekCount * 6; day++) {
    if (time.format("ddd") === "Sat") {
      time.add(48, "h");
      day--;
      continue;
    }
    allPossible.push([]);
    for (let halfHour = 0; halfHour < 6; halfHour++) {
      if (!eventArr.some(isOverlap.bind(null, time)))
        allPossible[day].push(time.toDate());
      time.add(30, "minutes");
    }
    time.add(1, "h").add(30, "minutes");
    for (let halfHour = 0; halfHour < 9; halfHour++) {
      if (!eventArr.some(isOverlap.bind(null, time)))
        allPossible[day].push(time.toDate());
      time.add(30, "minutes");
    }
    time.add(15, "h");
  }
  // console.log(allPossible);
  return allPossible;
}

function isOverlap(block30minMomentStart, event) {
  const potentialStartMoment = block30minMomentStart;
  const potentialEndMoment = moment(block30minMomentStart.toDate()).add(
    30,
    "minutes"
  );
  const val = !(
    potentialStartMoment.isSameOrAfter(event.end.dateTime) ||
    potentialEndMoment.isSameOrBefore(event.start.dateTime)
  );
  return val;
}

/**
 * return format: [{
 *    name: "...",
 *    email: "...",
 *    startTime: Date()
 * }]
 */
function pickBlocks(emails, allPossible) {
  const result = [];
  let names = [];
  if (emails[0] instanceof Array) {
    names = emails.map(([name, email]) => name);
    emails = emails.map(([name, email]) => email);
  } else emails = JSON.parse(JSON.stringify(emails));
  allPossible = JSON.parse(JSON.stringify(allPossible));
  let blockCount = allPossible.reduce((acc, day) => acc + day.length, 0);
  const studentCount = emails.length;
  const studentPerBlockRatio = studentCount / blockCount;

  allPossible.forEach(day => {
    let studentsInDay = Math.ceil(day.length * studentPerBlockRatio);
    for (let i = 0; i < studentsInDay; i++) {
      if (day.length && emails.length) {
        const temp = {
          email: emails.shift(),
          startTime: day.shift()
        };
        if (names.length) temp.name = names.shift();
        result.push(temp);
      }
    }
  });
  blockCount = allPossible.reduce((acc, day) => acc + day.length, 0);
  return {
    output: result,
    studentsRemaining: emails.length,
    blocksRemaining: blockCount
  };
}

async function logAndComfirm({ output, studentsRemaining, blocksRemaining }) {
  console.log(`\n\n----------------------------`.c_b);
  logEvent(output[0]);

  for (let i = 1; i < output.length; i++) {
    if (
      moment(output[i].startTime).format("dddd") !==
      moment(output[i - 1].startTime).format("dddd")
    )
      console.log(`\n----------------------------`.c_b);
    logEvent(output[i]);
  }

  console.log(`
Students remaining: ${studentsRemaining}
Time blocks remaining: ${blocksRemaining}
`);
  const ans = (await question("look good?\n")).trim().toLowerCase();
  console.log(`\n`);
  if (ans === "y" || ans === "yes" || ans === "depends on culture and fit") {
    console.log("Sending invites...");
    return true;
  } else {
    console.log("Doing nothing...");
    return false;
  }
}

function question(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(prompt, input => {
      rl.close();
      resolve(input);
    });
  });
}

function inviteAll(meetings, auth) {
  return Promise.all(
    meetings.map(meeting =>
      sendInvite(auth, meeting.startTime, meeting.email, meeting.name)
    )
  );
}

colors.setTheme({
  c_r: "red",
  c_b: "blue",
  c_y: "yellow",
  c_g: "green"
});

function logEvent(event) {
  if (event.name) console.log("-- ".c_b + "NAME: ".c_r + event.name.c_y);
  console.log("-- ".c_b + "EMAIL: ".c_r + event.email.c_y);
  console.log("-- ".c_b + moment(event.startTime).format("dddd Do hh:mmA").c_y);
  console.log(`----------------------------`.c_b);
}

function sendInvite(auth, startTime, email, name = null) {
  const event = {
    summary: "Meeting",
    start: {
      dateTime: startTime,
      timeZone: "America/Los_Angeles"
    },
    end: {
      dateTime: moment(startTime)
        .add(30, "minutes")
        .toDate(),
      timeZone: "America/Los_Angeles"
    },
    attendees: [{ email }]
  };
  if (name) {
    event.summary = `${name} <> Cory`;
  }

  const calendar = google.calendar({ version: "v3", auth });
  return calendar.events
    .insert({
      calendarId: "primary",
      resource: event,
      sendUpdates: "all"
    })
    .then(response => {
      return response.data;
    });
}

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, readdata) => {
      if (err && err.code === "ENOENT") {
        console.log(`File "${filePath}" not found...\n\n`.c_b);
        resolve(false);
      } else if (err) {
        console.log("failed to readFile".c_r);
        resolve(false);
        return;
      } else {
        const data = JSON.parse(readdata);
        resolve(data);
      }
    });
  });
}

function appendFile(data, filePath) {
  return new Promise(resolve => {
    fs.readFile(filePath, (err, readdata) => {
      if (err && err.code === "ENOENT") {
        console.log(`Creating "${filePath}"...\n\n`.c_b);
      } else if (err) {
        console.log("failed to write file".c_r);
        resolve(false);
        return;
      } else {
        data = Object.assign(JSON.parse(readdata), data);
      }
      fs.writeFile(filePath, JSON.stringify(data, null, 2), err => {
        if (err) {
          resolve(false);
          console.log(err);
        } else {
          resolve(true);
        }
      });
    });
  });
}
//            0         1         2       3                 4             5             6         7             8
// grid = [["SFDC ID", "Name", "Email", "Is Job Seeking", "Cohort Date", "Notes 3", "Notes 2", "Notes 1", "New Notes"]]
// meeting = ["001f100001OZ1R9", "Ali Alkaheli", "alialkaheli1@gmail.com", "Test", "Thu May 23 2019 16:00:00 GMT-0700 (PDT) {}"]
function updateStudentRow(grid, meeting) {
  const row = grid.find(fRow => {
    return fRow[0] === meeting[0]
  });
  row[5] = row[6];
  row[6] = row[7];
  row[7] = `${moment(meeting[4]).format("ddd MMM Do")}: ${
    meeting[3]
  }`
  row[8] = ""
}

function toA1(x) {
  // works up to x = 26 * 26 - 1
  const toChar = int => String.fromCharCode(int + 65);
  if (x > 25) return toA1(Math.floor(x / 26) - 1) + toChar(x % 26);
  return toChar(x % 25);
}

module.exports = {
  updateStudentRow,
  readFile,
  toA1,
  getBlocks,
  logAndComfirm,
  pickBlocks,
  inviteAll,
  appendFile,
  question,
  sendInvite
};
