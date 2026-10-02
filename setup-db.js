/*jshint esversion: 8 */
/* jshint node: true */

//Creates the tables, the test account and some sample books (see schema.sql)
const fs = require("fs");
const { createClient } = require("./db");

const CON_STRING = process.env.DB_CON_STRING;
if (CON_STRING == undefined) {
  console.log("Error: Environment variable DB_CON_STRING not set!");
  process.exit(1);
}

const dbClient = createClient(CON_STRING);

async function setup() {
  await dbClient.connect();
  await dbClient.query(fs.readFileSync(__dirname + "/schema.sql", "utf8"));
  console.log("Database is ready!");
}

setup()
  .catch(function(err) {
    console.log("Error: " + err.message);
    process.exitCode = 1;
  })
  .finally(function() {
    dbClient.end();
  });
