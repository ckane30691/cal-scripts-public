const jsforce = require("jsforce");
const { email, password, demoAccountID } = require("./password");
const conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com'
});
const moment = require("moment");
const COACH_IDX_REPORT = 2;
const STUDENT_NAME_IDX_REPORT = 1;
const DATE_OF_MEETING_IDX = 4;

createMeeting = async () => {
  const userInfo = await conn.login(email, password);
  console.log(conn.accessToken);
  console.log(conn.instanceUrl);
  // logged in user property
  console.log("User ID: " + userInfo.id);
  console.log("Org ID: " + userInfo.organizationId);
  try {
    response = await conn.sobject("Meeting__c").create({
      Account__c: demoAccountID,
      Staff_Name__c: "Ethan Bjornsen",
      Date_Time_of_Meeting__c: Date.now(),
      Notes__c: "This will work :)",
      Meeting_Type__c: "General Check-In"
    });
    debugger;
  } catch (error) {
    debugger;
  }
};

/**
 * OUTPUT:
 *   {
 *    headers: [ "h1", "h2" ... ]
 *    data: [ "data1", "data2" ... ]
 *   }
 */
get2dArrFromReportId = async reportId => {
  const userInfo = await conn.login(email, password);
  const report = conn.analytics.report(reportId);
  return new Promise((resolve, reject) => {
    report.execute({ details: true }, function(err, result) {
      if (err) {
        return console.error(err);
      }
      const output = {};
      output.headers = [...result.reportMetadata.detailColumns];
      output.data = result.factMap["T!T"].rows.map(row => {
        return row.dataCells.map(cellObject => cellObject.label);
      });
      resolve(output);
    });
  });
};

function filterMeetingsByCoach({ coachName, rows }) {
  return rows
    .filter(row => row[COACH_IDX_REPORT] === coachName)
    .map(row => [...row]);
}

function groupByStudent(acc, row) {
  if (!acc[row[STUDENT_NAME_IDX_REPORT]]) {
    acc[row[STUDENT_NAME_IDX_REPORT]] = [];
  }
  acc[row[STUDENT_NAME_IDX_REPORT]].push([...row]);
  return acc;
}

const fetchData = (async () => {
  const result = await get2dArrFromReportId("00O3a000004nhh6EAA");
  const myMeetings = filterMeetingsByCoach({
    coachName: "Cory Kane",
    rows: result.data
  });
  const groupedByStudent = myMeetings.reduce(groupByStudent, {});
  Object.keys(groupedByStudent).map(name =>
    groupedByStudent[name].sort(
      (a, b) =>
        moment(a[DATE_OF_MEETING_IDX]).format("YYYYMMDD") -
        moment(b[DATE_OF_MEETING_IDX]).format("YYYYMMDD")
    )
  );
  debugger;
  return groupByStudent;
});


(async () => {
  const groupedByStudent = await fetchData();
  
})
// createMeeting() // this works
