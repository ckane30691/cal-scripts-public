const { google } = require("googleapis");
const { runWithAuth } = require("./google");

function getSheet(range, spreadsheetId, resolve, auth) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      resolve(res.data);
    }
  );
}

const createSheet = async (spreadsheetId, resolve, auth) => {
  const tabName = "Note Sheet";
  const rowCount = 60;
  const columnCount = 12;
  const sheets = google.sheets({ version: "v4", auth });
  const newSheetResource = {
    requests: [
      {
        addSheet: {
          properties: {
            title: tabName,
            gridProperties: {
              rowCount,
              columnCount
            },
            tabColor: {
              red: 0.5,
              green: 1,
              blue: 0.5
            }
          }
        }
      }
    ]
  };
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: newSheetResource
  });
  resolve(Object.assign(response, { tabName, rowCount, columnCount }));
  return true;
};

function getSpreadsheetData({ spreadsheetId }, resolve, auth) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.getByDataFilter({ spreadsheetId }, (err, response) => {
    if (err) {
      console.log(err.errors[0].message)
    } else {
      resolve(response.data);
    }
  });
}

async function checkIfTabExists({ spreadsheetId, tabName }) {
  const data = await runWithAuth(
    getSpreadsheetData.bind(null, { spreadsheetId })
  );
  const foundTab = data.sheets.find(tab => tab.properties.title === tabName);
  if (foundTab) {
    return { ...foundTab.properties, exists: true };
  } else {
    return { exists: false };
  }
}

const writeToSheet = async (
  { a1Range, spreadsheetId, arr2d },
  resolve,
  auth
) => {
  const sheets = google.sheets({ version: "v4", auth });
  const resource = { values: arr2d };
  const valueInputOption = "USER_ENTERED";
  sheets.spreadsheets.values.update(
    {
      spreadsheetId,
      range: a1Range,
      valueInputOption,
      resource
    },
    (err, result) => {
      if (err) {
        console.log("err in writeToSheet", err);
      } else {
        resolve(result);
      }
    }
  );
};

module.exports = {
  checkIfTabExists,
  writeToSheet,
  getSheet,
  createSheet
};
