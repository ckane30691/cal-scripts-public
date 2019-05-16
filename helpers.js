const moment = require("moment");

function getBlocks(inputEventArr) {
  const allPossible = [];
  let eventArr = JSON.parse(JSON.stringify(inputEventArr));
  eventArr = eventArr.filter(event => event.start.dateTime);
  const time = moment(eventArr[0].start.dateTime)
    .startOf("week")
    .add(1, "day")
    .add(9, "h");
  for (let day = 0; day < 5; day++) {
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

module.exports = {
  getBlocks
};
