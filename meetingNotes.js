const moment = require("moment");

/**
 * groupedByStudent:
 * {
 *    [studentName]: [
 *      [ // oldest meeting
 *        0: "ACCOUNT_ID"
 *        1: "ACCOUNT.NAME"
 *        2: "Account.Coach__c"
 *        3: "CUST_ID"
 *        4: "CUST_CREATED_DATE"
 *        5: "Meeting__c.Notes__c"
 *        6: "Account.Job_Seeking__c"
 *        7: "job search start date"
 *        8: "date/time of meeting"
 *        9: "email"
 *      ],
 *      [ // 2nd oldest meeting
 *        ... same format
 *      ],
 *      [// 3rd ...],
 *    ],
 *    [other_student_name]: [
 *      array of meetings oldest to newest
 *    ]
 * }
 */

function buildGrid(groupedByStudent, fromIntDB) {
  const headers = [
    [
      "SFDC ID",
      "Name",
      "Email",
      "Is Job Seeking",
      "Cohort Date",
      "Notes 3",
      "Notes 2",
      "Notes 1",
      "New Notes",
      "Activity In Past 2 Weeks",
      "Num Apps",
      "Networking Connections",
      "Phone Screens",
      "Video Screens",
      "Coding Challenges",
      "Onsites",
      "Strikes",
      "Days Searching",
      "Personal Site",
      "FSP",
      "Flex",
      "JSP",
      "Resume",
      "Cover Letter",
      "PAR"
    ]
  ];
  const output = Object.values(groupedByStudent).map(meetingArray => {
    let row = [];
    row.push(meetingArray[0][0]); // student id
    row.push(meetingArray[0][1]); // student name
    row.push(meetingArray[0][9]); // email
    row.push(meetingArray[0][6]); // job seeking
    row.push(meetingArray[0][7]); // start date
    // row.push("notes"); // 3rd most recent meeting
    // row.push("notes"); // 2nd most recent meeting
    // row.push("notes"); // most recent meeting
    if (fromIntDB == undefined) {
      const notes = ["", ""]
      .concat(
        meetingArray.map(
          meeting =>
          `${moment(new Date(meeting[8])).format("ddd MMM Do")}: ${
            meeting[5]
          }`
        )
      )
      .slice(-3);
      row = row.concat(notes);
      row.push("");
    }
    return row;
  });
  output.sort((a, b) =>
    moment(a[4], "D-M-YYYY").diff(moment(b[4], "D-M-YYYY"), "hours")
  );
  return headers.concat(output);
}

module.exports = { buildGrid };
