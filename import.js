/*jshint esversion: 6 */
/* jshint node: true */

//Imports books from a CSV file with the columns: isbn, title, author, year
//Usage: node import.js [file.csv]
const fs = require('fs');
const CsvReadableStream = require('csv-reader');
const { createClient } = require('./db');

const CON_STRING = process.env.DB_CON_STRING;
if (CON_STRING == undefined) {
  console.log("Error: Environment variable DB_CON_STRING not set!");
  process.exit(1);
}

const csvFile = process.argv[2] || 'bookwithzeroes.csv';
const dbClient = createClient(CON_STRING);
let rowCount = 0;
let lastInsert = Promise.resolve();

dbClient.connect().then(() => {
  fs.createReadStream(csvFile, 'utf8')
    .on('error', function(err) {
      console.log("Error: Could not read " + csvFile + " (" + err.message + ")");
      dbClient.end();
      process.exitCode = 1;
    })
    .pipe(new CsvReadableStream({ parseBooleans: true, skipEmptyLines: true }))
    .on('data', function(row) {
      rowCount++;
      //one insert at a time, pg does not allow parallel queries on one client
      lastInsert = lastInsert.then(() => dbClient.query("INSERT INTO books (title, author, year, isbn) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [row[1], row[2], row[3], row[0]])
        .catch((dbErr) => console.log("Could not import " + row[0] + ": " + dbErr.message)));
    })
    .on('end', function() {
      lastInsert.then(() => {
        console.log("Processed " + rowCount + " rows from " + csvFile);
        dbClient.end();
      });
    });
}).catch((err) => {
  console.log("Error: Could not connect to the database (" + err.message + ")");
  process.exitCode = 1;
});
