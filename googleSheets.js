const { google } = require("googleapis");
const spreadsheetId = "18JAZIlXHlFlvIQKdwLG1KAtPSJujRHm23oh1Noxz5Rc";

function getSheet(resolve, auth) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range: "Sheet1!A1:C6"
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      resolve(res.data);
    }
  );
}

const createSheet = async (resolve, auth) => {
  const sheets = google.sheets({ version: "v4", auth });
  const newSheetResource = {
    requests: [
      {
        addSheet: {
          properties: {
            title: "testSheet",
            gridProperties: {
              rowCount: 20,
              columnCount: 12
            },
            tabColor: {
              red: 1.0,
              green: 0.3,
              blue: 0.4
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
  resolve(response);
  return true;
};

module.exports = {
  getSheet,
  createSheet
};
