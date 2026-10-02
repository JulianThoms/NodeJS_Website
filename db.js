/*jshint esversion: 6 */
/* jshint node: true */

const pg = require("pg");

//pg 8 verifies certificates by default; hosted DBs often use self-signed ones.
//Add "?sslmode=disable" to the connection string for a local DB without SSL.
module.exports.createClient = function(conString) {
  return new pg.Client({
    connectionString: conString,
    ssl: {
      rejectUnauthorized: false
    }
  });
};
