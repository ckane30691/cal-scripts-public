const { getSchedule, confirmAndSend, runWithAuth } = require("./google");
const { getSheet, createSheet } = require("./googleSheets");

const scheduleWeekPrompt = async () => {
  const { events, startingWeek, duration, auth } = await runWithAuth(getSchedule);
  console.log(auth);
  const result = await confirmAndSend(events, duration, auth);
};

const hitSheets = async () => {
  const data = await runWithAuth(getSheet);
  debugger;
};

const makeSheet = async () => {
  const result = await runWithAuth(createSheet);
  debugger
}

// scheduleWeekPrompt();
// hitSheets();
// makeSheet();