const { toA1, readFile, appendFile } = require("./helpers");
const moment = require("moment");
const { updateStudentRow } = require("./helpers");
const {
  getSchedule,
  getSchedulePreset,
  confirmAndSend,
  runWithAuth
} = require("./google");
const { fetchMeetingsByCoach, createMeeting } = require("./sfdc");
const { buildGrid } = require("./meetingNotes");
const {
  getSheet,
  createSheet,
  writeToSheet,
  checkIfTabExists
} = require("./googleSheets");

const COACH_NAME = "Ethan Bjornsen";

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

const writeData = async ({ tabName, arr2d, spreadsheetId }) => {
  const maxCol = toA1(arr2d[0].length);
  const maxRow = arr2d.length;
  const a1Range = `${tabName}!A1:${maxCol}${maxRow}`;
  const result = await runWithAuth(
    writeToSheet.bind(null, {
      a1Range,
      spreadsheetId,
      arr2d
    })
  );
  return result;
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
        spreadsheetId: null
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
    tabName: "Note Sheet"
  });
  if (!tabData.exists) {
    console.log("Creating tab...".c_b);
    const { tabName, rowCount, columnCount } = await runWithAuth(createSheet);
    await appendFile(
      {
        tabName,
        rowCount,
        columnCount
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
        columnCount: tabData.gridProperties.columnCount
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
    .filter(event => moment(event.start.dateTime).isBefore(moment()))
    .reverse(); // .find(el => bool)

  console.log("Fetching tab data...".c_b);
  const range = `${tabName}!A1:${toA1(columnCount - 1)}${rowCount}`;
  const sheetData = await runWithAuth(getSheet.bind(null, range));

  const newNotes = cp(sheetData)
    .values.slice(1)
    .filter(row => row[sheetData.values[0].length - 1] !== undefined);
  newNotes.forEach(
    row => row.splice(3, 5) // keep "SFDC ID","Name","Email","New Notes"
  );
  newNotes.forEach(row => {
    const mostRecentMeeting = pastEvents.find(
      event =>
        event.attendees && event.attendees.find(obj => obj.email === row[2])
    );
    if (!mostRecentMeeting) {
      row.push(
        moment()
          .startOf("day")
          .add(9, "h")
          .toDate()
      );
    } else {
      row.push(moment(mostRecentMeeting.start.dateTime).toDate());
    }
    // TODO: Bug here?
  });
  debugger;
  console.log("Writing meeting notes to SFDC...\n".c_b);

  const promises = newNotes.map(noteData =>
    createMeeting({
      sfdcId: noteData[0],
      studentName: noteData[1],
      notes: noteData[3],
      dateTime: noteData[4],
      coach: COACH_NAME
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
    updateRowsCount: rowCount
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
  updateRowsCount
}) => {
  const groupedByStudent = await fetchMeetingsByCoach(COACH_NAME);
  const grid = buildGrid(groupedByStudent);
  if (updateRowsCount) {
    for (let i = grid.length; i < updateRowsCount; i++) {
      grid.push(Array(grid[0].length).fill(""));
    }
  }
  newNotes.forEach(meeting => {
    updateStudentRow(grid, meeting);
  });
  const result = await writeData({ tabName, arr2d: grid, spreadsheetId });
  return result;
};

// scheduleWeekPrompt();
// hitSheets();
// makeSheet();
// writeData();
// reportToSheet({
//   spreadsheetId: "18JAZIlXHlFlvIQKdwLG1KAtPSJujRHm23oh1Noxz5Rc",
//   tabName: "Note Sheet",
//   updateRowsCount: 60
// });
inputNotesFromSheet();
// (async () => {
//   const result = await checkIfTabExists({
//     spreadsheetId: "18JAZIlXHlFlvIQKdwLG1KAtPSJujRHm23oh1Noxz5Rc",
//     tabName: "Note Sheet"
//   });
//   debugger;
// })();
