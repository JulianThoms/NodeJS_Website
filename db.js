/*jshint esversion: 6 */
/* jshint node: true */

const pg = require("pg");

//pg 8 verifies certificates by default; hosted DBs often use self-signed ones.
//Add "?sslmode=disable" to the connection string for a local DB without SSL.
function config(conString) {
  return {
    connectionString: conString,
    ssl: {
      rejectUnauthorized: false
    }
  };
}

//single connection, for scripts that run one query after another
module.exports.createClient = function(conString) {
  return new pg.Client(config(conString));
};

//several connections, so parallel queries (e.g. from different visitors) work
module.exports.createPool = function(conString) {
  return new pg.Pool(config(conString));
};
