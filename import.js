var fs = require('fs');
var CsvReadableStream = require('csv-reader');
var inputStream = fs.createReadStream('bookwithzeroes.csv', 'utf8')
inputStream
    .pipe(CsvReadableStream({parseBooleans: true, skipEmptyLines: true}))
    .on('data', function (row) {
        console.log('A row arrived: ', row[0]);
        dbClient.query("INSERT INTO books (title, author, year, isbn) VALUES ($1, $2, $3, $4)", [row[1], row[2], row[3], row[0]], function(dbErr, dbRes){
          if(dbErr){
            console.log(dbErr);
          }
        });
    })
    .on('end', function (data) {
        console.log('No more rows!');
      });
