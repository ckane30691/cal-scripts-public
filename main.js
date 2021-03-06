const { toA1, readFile, appendFile } = require("./helpers");
const moment = require("moment");
const axios = require("axios");
const { updateStudentRow } = require("./helpers");
const {
  getSchedule,
  getSchedulePreset,
  confirmAndSend,
  runWithAuth,
} = require("./google");
const { fetchMeetingsByCoach, createMeeting } = require("./sfdc");
const { buildGrid } = require("./meetingNotes");
const {
  getSheet,
  createSheet,
  writeToSheet,
  checkIfTabExists,
} = require("./googleSheets");
const puppeteer = require("puppeteer");
const csv = require("csv-parser");
const fs = require("fs");

const COACH_NAME = "Cory Kane";

const scheduleWeekPrompt = async () => {
  const { events, startingWeek, duration, auth } = await runWithAuth(
    getSchedule
  );
  // console.log(auth);
  const result = await confirmAndSend(events, duration, auth);
};

const hitSheets = async () => {
  const data = await runWithAuth(getSheet);
};

const makeSheet = async () => {
  const result = await runWithAuth(createSheet);
};

const writeData = async ({ tabName, arr2d, spreadsheetId, gid }) => {
  debugger;
  const maxCol = toA1(getMaxCol(arr2d));
  const maxRow = arr2d.length;
  const a1Range = `${tabName}!A1:${maxCol}${maxRow}`;
  debugger;
  const result = await runWithAuth(
    writeToSheet.bind(null, {
      a1Range,
      spreadsheetId,
      arr2d,
      gid,
    })
  );
  return result;
};

const getMaxCol = (arr) => {
  let biggest = -1;
  for (let i = 0; i < arr.length; i++) {
    biggest = arr[i].length > biggest ? arr[i].length : biggest;
  }
  debugger;
  return biggest;
};

const inputNotesFromSheet = async () => {
  // let tabName = null;
  // let rowCount = null;
  // let columnCount = null;
  // let spreadsheetId = null;
  const newNotesColumnIdx = 8;
  const fileData = await readFile("./sheetsData.json");
  if (!fileData || !fileData.spreadsheetId) {
    await appendFile(
      {
        spreadsheetId: null,
      },
      "./sheetsData.json"
    );
    console.log(`Please fill out data in "sheetsData.json"`.c_b);
    console.log(
      `spreadsheetId = `.c_g +
        `https://docs.google.com/spreadsheets/d/`.c_r +
        `1gTlwfp7rtI3i___this-part-of-url___LCaZI6pC604ubA`.c_g +
        `/edit#gid=12345`.c_r
    );
    return false;
  }
  console.log(`Checking if tab exists...`.c_b);
  const tabData = await checkIfTabExists({
    spreadsheetId: fileData.spreadsheetId,
    tabName: "Note Sheet",
  });
  if (!tabData.exists) {
    console.log("Creating tab...".c_b);
    const { tabName, rowCount, columnCount } = await runWithAuth(
      createSheet.bind(null, fileData.spreadsheetId)
    );
    await appendFile(
      {
        tabName,
        rowCount,
        columnCount,
      },
      "./sheetsData.json"
    );
    await reportToSheet({ tabName, spreadsheetId: fileData.spreadsheetId });
    console.log("Tab created".c_g);

    return;
  } else {
    await appendFile(
      {
        tabName: tabData.title,
        rowCount: tabData.gridProperties.rowCount,
        columnCount: tabData.gridProperties.columnCount,
      },
      "./sheetsData.json"
    );
  }
  const { tabName, rowCount, columnCount, spreadsheetId } = await readFile(
    "./sheetsData.json"
  );

  console.log("Fetching calendar...".c_b);
  const { events, startingWeek, duration } = await runWithAuth(
    getSchedulePreset.bind(null, -2, 3)
  );
  const pastEvents = events
    .filter((event) => moment(event.start.dateTime).isBefore(moment()))
    .reverse(); // .find(el => bool)

  console.log("Fetching tab data...".c_b);
  const range = `${tabName}!A1:${toA1(columnCount - 1)}${rowCount}`;
  const sheetData = await runWithAuth(
    getSheet.bind(null, range, fileData.spreadsheetId)
  );

  const newNotes = cp(sheetData)
    .values.slice(1)
    .filter((row) => row[8]);
  newNotes.forEach(
    (row) => row.splice(3, 5) // keep "SFDC ID","Name","Email","New Notes"
  );
  newNotes.forEach((row) => {
    const mostRecentMeeting = pastEvents.find(
      (event) =>
        event.attendees && event.attendees.find((obj) => obj.email === row[2])
    );
    if (!mostRecentMeeting) {
      row.splice(4, 0, moment().startOf("day").add(9, "h").toDate());
    } else {
      row.splice(4, 0, moment(mostRecentMeeting.start.dateTime).toDate());
    }
    // TODO: Bug here?
  });
  debugger;
  console.log("Writing meeting notes to SFDC...\n".c_b);

  const promises = newNotes.map((noteData) =>
    createMeeting({
      sfdcId: noteData[0],
      studentName: noteData[1],
      notes: noteData[3],
      dateTime: noteData[4],
      coach: COACH_NAME,
    })
  );
  const results = await Promise.all(promises);
  let anyFailure = false;
  results.forEach((success, i) => {
    if (success) {
      console.log(`${newNotes[i][1]}: Success...`.c_g);
    } else {
      console.log(`${newNotes[i][1]}: Failed...`.c_r);
      anyFailure = true;
    }
  });
  if (anyFailure) return false;
  console.log("\nUpdating sheet...".c_b);

  // TODO: too fast. Does not include new meetings in update. need plan B
  await reportToSheet({
    newNotes,
    tabName,
    spreadsheetId,
    updateRowsCount: rowCount,
  });
  console.log("Finished".c_g);
};

function cp(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const reportToSheet = async ({
  newNotes = [],
  tabName,
  spreadsheetId,
  updateRowsCount,
  fromIntDB,
  gid,
}) => {
  debugger;
  const groupedByStudent = await fetchMeetingsByCoach(COACH_NAME);
  const grid = buildGrid(groupedByStudent, fromIntDB);
  if (updateRowsCount) {
    for (let i = grid.length; i < updateRowsCount; i++) {
      grid.push(Array(grid[0].length).fill(""));
    }
  }
  newNotes.forEach((meeting) => {
    updateStudentRow(grid, meeting, fromIntDB);
  });
  debugger;
  const result = await writeData({ tabName, arr2d: grid, spreadsheetId, gid });
  return result;
};

const loginToInterviewDB = async (email, password) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.interview-db.com/staff");

  // break out into helper
  await page.waitFor("#advocate_email");
  await page.waitFor("#advocate_password");
  await page.evaluate(
    (email, password) => {
      window.password = password;
      window.email = email;
    },
    email,
    password
  );
  await page.$eval("#advocate_email", (el) => (el.value = window.email));
  await page.$eval("#advocate_password", (el) => (el.value = window.password));
  await page.evaluate(() => {
    window.password = null;
    window.email = null;
  });
  await page.click('input[type="submit"]');

  await page.waitForNavigation();
  return page;
};

const getProjectNotesFromIntDB = async () => {
  let res = await axios.get(
    "https://data.heroku.com/dataclips/lbedkofqdtsqxegqmyegebrvrivp.json?access-token=41342023-ecc2-4879-8096-0d92540d89ab"
  );
  let studentArr = res.data.values;
  let allData = [];
  for (let i = 0; i < studentArr.length; i++) {
    let currStudent = studentArr[i];
    let studentObj = {};
    studentObj.coach = currStudent[0];
    studentObj.id = currStudent[1];
    studentObj.fname = currStudent[2];
    studentObj.lname = currStudent[3];
    studentObj.tuition = currStudent[4];
    studentObj.email = currStudent[5];
    studentObj.uuid = currStudent[6];
    let key = currStudent[7].toLowerCase().split(" ").join("_");
    studentObj[key + "_percent_completed"] = currStudent[8];
    allData.push(studentObj);
  }
  let seen = {};
  let final = [];
  for (let i = 0; i < allData.length; i++) {
    if (seen[allData[i].id]) continue;
    let updatedStudent = {};
    for (let j = 1; j < allData.length; j++) {
      if (allData[i].id === allData[j].id) {
        Object.assign(allData[i], allData[j]);
      }
    }
    seen[allData[i].id] = true;
    final.push(allData[i]);
    // debugger
  }
  return final;
};

var email = require("./intDB_password.js").email;
var password = require("./intDB_password.js").password;

const forgiveStrikesWithPuppeteer = async (
  numStrikesToForgive,
  email,
  password
) => {
  let page = await loginToInterviewDB(email, password);
  // await page.waitFor(".sc-iGPElx");
  // await page.click(".sc-iGPElx");
  // await page.type('.sc-iGPElx"]', "Per Cory", { delay: 10 });
  // await page.click(".sc-dxgOiQ");
  await page.click('input[type="text"]');
  await page.type('input[type="number"]', "Rome", { delay: 10 });
};

const getNotesWithPuppeteer = async (email, password) => {
  let page = await loginToInterviewDB(email, password);
  // break out into helper
  await page.waitFor(".sc-fOKMvo");
  await page.waitFor(2000);
  await page.click(".sc-fOKMvo");
  await page.waitFor(".sc-dUjcNx");
  await page.waitFor(1000);
  let idx = 7;
  while (idx < 13) {
    await page.click(`.sc-dUjcNx div:nth-child(${idx})`, idx++);
  }

  // break out into helper
  await page.click('input[type="number"]');
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Backspace");
  await page.type('input[type="number"]', "14", { delay: 100 });

  await page.waitFor(4000);

  // break out into helper
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "./bin",
  });
  await page.waitFor('[download="generatedBy_react-csv.csv"]');
  await page.click('[download="generatedBy_react-csv.csv"]');
  await page.waitFor(3000);

  await browser.close();
  let result = [];
  fs.createReadStream("./bin/generatedBy_react-csv.csv")
    .pipe(csv())
    .on("data", (row) => {
      result.push(row);
    })
    .on("end", () => {
      console.log("CSV file successfully processed");
    });
  return result;
};

const writeIntDBNotesToSheet = async (csvArr) => {
  // helper function
  const fileData = await readFile("./sheetsData.json");
  if (!fileData || !fileData.spreadsheetId) {
    await appendFile(
      {
        spreadsheetId: null,
      },
      "./sheetsData.json"
    );
    console.log(`Please fill out data in "sheetsData.json"`.c_b);
    console.log(
      `spreadsheetId = `.c_g +
        `https://docs.google.com/spreadsheets/d/`.c_r +
        `1gTlwfp7rtI3i___this-part-of-url___LCaZI6pC604ubA`.c_g +
        `/edit#gid=12345`.c_r
    );
    return false;
  }
  console.log(`Checking if tab exists...`.c_b);
  const tabData = await checkIfTabExists({
    spreadsheetId: fileData.spreadsheetId,
    tabName: "Note Sheet",
  });
  if (!tabData.exists) {
    console.log("Creating tab...".c_b);
    const { tabName, rowCount, columnCount } = await runWithAuth(
      createSheet.bind(null, fileData.spreadsheetId)
    );
    await appendFile(
      {
        tabName,
        rowCount,
        columnCount,
      },
      "./sheetsData.json"
    );
    await reportToSheet({ tabName, spreadsheetId: fileData.spreadsheetId });
    console.log("Tab created".c_g);

    return;
  } else {
    await appendFile(
      {
        tabName: tabData.title,
        rowCount: tabData.gridProperties.rowCount,
        columnCount: tabData.gridProperties.columnCount,
      },
      "./sheetsData.json"
    );
  }
  const { tabName, rowCount, columnCount, spreadsheetId, gid } = await readFile(
    "./sheetsData.json"
  );

  console.log("Fetching tab data...".c_b);
  // helper function
  const range = `${tabName}!A1:${toA1(columnCount - 1)}${rowCount}`;
  const sheetData = await runWithAuth(
    getSheet.bind(null, range, fileData.spreadsheetId)
  );

  const newNotes = csvArr;
  // console.log(csvArr)
  console.log("\nUpdating sheet...".c_b);
  debugger;
  await reportToSheet({
    newNotes,
    tabName,
    spreadsheetId,
    fromIntDB: true,
    gid,
  });
  // write function to color cells here

  console.log("\nSheet Updated".c_b);
};

// writeIntDBNotesToSheet(data);
// forgiveStrikesWithPuppeteer(1, email, password);
scheduleWeekPrompt();
// (async () => {
// const projectNotes = await getProjectNotesFromIntDB();
// await writeIntDBNotesToSheet(projectNotes);
// const csvArr = await getNotesWithPuppeteer(email, password);
// let result = [];
// fs.createReadStream('./bin/generatedBy_react-csv.csv')
// .pipe(csv())
// .on('data', (row) => {
//   result.push(row);
// })
// .on('end', () => {
//   console.log('CSV file successfully processed');
// });
// await writeIntDBNotesToSheet(csvArr);
// })();

// hitSheets();
// makeSheet();
// writeData();
// reportToSheet({
//   spreadsheetId: "18JAZIlXHlFlvIQKdwLG1KAtPSJujRHm23oh1Noxz5Rc",
//   tabName: "Note Sheet",
//   updateRowsCount: 60
// });
// inputNotesFromSheet();
// (async () => {
//   const result = await checkIfTabExists({
//     spreadsheetId: "18JAZIlXHlFlvIQKdwLG1KAtPSJujRHm23oh1Noxz5Rc",
//     tabName: "Note Sheet"
//   });
//   debugger;
// })();
