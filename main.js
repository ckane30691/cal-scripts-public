const { getSchedule, confirmAndSend, runWithAuth } = require("./google");

const scheduleWeekPrompt = async () => {
  const { events, startingWeek, duration, auth } = await runWithAuth(getSchedule);
  console.log(auth);
  const result = await confirmAndSend(events, duration, auth);
}

scheduleWeekPrompt();