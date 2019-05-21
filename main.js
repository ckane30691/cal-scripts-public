const { getSchedule, confirmAndSend, runWithAuth } = require("./google");

const scheduleWeekPrompt = async () => {
  const { events, startingWeek, duration } = await runWithAuth(getSchedule);
  const result = await confirmAndSend(events, duration);
}

scheduleWeekPrompt();