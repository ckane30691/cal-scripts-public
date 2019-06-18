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
  { a1Range, spreadsheetId, arr2d, gid },
  resolve,
  auth
) => {
  const sheets = google.sheets({ version: "v4", auth });
  const resource = {
    values: arr2d,
   };
  const valueInputOption = "USER_ENTERED";
  await sheets.spreadsheets.values.update(
    {
      spreadsheetId,
      range: a1Range,
      valueInputOption,
      resource,
    },
    (err, result) => {
      if (err) {
        console.log("err in writeToSheet", err);
      } else {
        resolve(result);
      }
    }
  );
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      "requests": [
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 9,
                  "endColumnIndex": 10,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "TEXT_EQ",
                  "values": [
                    {
                      "userEnteredValue": "FALSE"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.2,
                    "red": 0.8,
                  }
                }
              }
            },
            "index": 0
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 9,
                  "endColumnIndex": 10,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "TEXT_EQ",
                  "values": [
                    {
                      "userEnteredValue": "TRUE"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.8,
                    "red": 0.2,
                  }
                }
              }
            },
            "index": 1
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 10,
                  "endColumnIndex": 11,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "NUMBER_GREATER_THAN_EQ",
                  "values": [
                    {
                      "userEnteredValue": "25"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.8,
                    "red": 0.2,
                  }
                }
              }
            },
            "index": 2
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 11,
                  "endColumnIndex": 12,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "NUMBER_GREATER_THAN_EQ",
                  "values": [
                    {
                      "userEnteredValue": "15"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.8,
                    "red": 0.2,
                  }
                }
              }
            },
            "index": 3
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 12,
                  "endColumnIndex": 16,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "NUMBER_GREATER_THAN_EQ",
                  "values": [
                    {
                      "userEnteredValue": "1"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.8,
                    "red": 0.2,
                  }
                }
              }
            },
            "index": 4
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 16,
                  "endColumnIndex": 17,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "NUMBER_GREATER_THAN_EQ",
                  "values": [
                    {
                      "userEnteredValue": "7"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.2,
                    "red": 0.8,
                  }
                }
              }
            },
            "index": 5
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 18,
                  "endColumnIndex": 25,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "NUMBER_GREATER_THAN_EQ",
                  "values": [
                    {
                      "userEnteredValue": "70"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.8,
                    "red": 0.2,
                  }
                }
              }
            },
            "index": 6
          }
        },
        {
          "addConditionalFormatRule": {
            "rule": {
              "ranges": [
                {
                  "sheetId": gid,
                  "startColumnIndex": 18,
                  "endColumnIndex": 25,
                },
              ],
              "booleanRule": {
                "condition": {
                  "type": "NUMBER_LESS_THAN_EQ",
                  "values": [
                    {
                      "userEnteredValue": "50"
                    }
                  ]
                },
                "format": {
                  "backgroundColor": {
                    "green": 0.2,
                    "red": 0.8,
                  }
                }
              }
            },
            "index": 7
          }
        },
      ]
    }
}).catch(err => console.log(err))
};

module.exports = {
  checkIfTabExists,
  writeToSheet,
  getSheet,
  createSheet
};
