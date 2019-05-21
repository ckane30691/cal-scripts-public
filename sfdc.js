const jsforce = require("jsforce");
const { email, password, demoAccountID } = require("./password");
const conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com'
});
testing = async () => {
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

// testing() // this works




