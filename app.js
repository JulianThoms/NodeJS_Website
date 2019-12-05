var express = require("express");
var pg = require("pg");
var bodyParser = require("body-parser");
var session = require("express-session");

global.loggedIn = false;
global.loggedOut = false;

const CON_STRING = process.env.DB_CON_STRING;
if (CON_STRING == undefined) {
    console.log("Error: Environment variable DB_CON_STRING not set!");
    process.exit(1);
}

pg.defaults.ssl = true;
var dbClient = new pg.Client(CON_STRING);
dbClient.connect();

var urlencodedParser = bodyParser.urlencoded({
    extended: false
});

const PORT = 3000;

var app = express();

app.use(session({
    secret: "This is a secret!",
    resave:true,
    cookie: { maxAge: 3600000 }, //time in millisecs before cookie expires
    saveUninitialized: false
}));


//allowing CSS
app.use(express.static(__dirname + '/public'));

app.set("views", "views");
app.set("view engine", "pug");

app.get("/", function (req, res) {
  if(req.session.user != undefined){
      loggedIn = true;
      res.render("index");
  }
  else if (loggedOut == true){
    loggedIn = false;
    res.render("index");
    loggedOut = false;
  }
  else{
        loggedIn = false;
        res.render("index");
  }
});
/*
app.get("/flights", function (req, res) {
     List all flights
    dbClient.query("SELECT * FROM flights", function (dbError, dbResponse) {
        res.render("flights", {
            flights: dbResponse.rows
        });
    });
});
*/

app.get("/favourites", function (req, res){
  let favourites = "";
  let username = req.session.user;
  dbClient.query("SELECT id_user FROM users WHERE name = $1", ['test'], function(dbErr, dbRes){
    console.log(dbRes.rows[0].id_user)
    let id = dbRes.rows[0].id_user;
    if(id != undefined){
    dbClient.query("SELECT books.title FROM (books INNER JOIN users_favourites ON books.id_book = users_favourites.id_book) INNER JOIN users ON users.id_user = users_favourites.id_user WHERE users.id_user = $1", [id], function(dbErr, dbRes){
      console.log(dbRes.rows)
      res.render("favourites", {
        favourites: dbRes.rows, username
      });
    });
  }});
});

app.get("/login", function(req, res){
  if(req.session.user != undefined){
    loggedIn = true;
    let username = req.session.user;
    res.render("login", {loggedIn, username});
  }
  else{
    loggedIn = false;
    res.render("login", {loggedIn});
  }

});

app.get("/signup", function(req, res){
  if(req.session.user != undefined){
    loggedIn = true;
    let username = req.session.user;
    console.log(loggedIn);
    res.render("signup", {loggedIn, username});
  }
  else{
    loggedIn = false;
    console.log(loggedIn);
    res.render("signup", {loggedIn});
  }
});

/*
app.get("/successful_login", function(req, res){
  if(req.session.user != undefined){
    res.render("successful_login");

    }
  else{
    res.render("login", {error_login: "Please log in to access this Page!"})
  }
});

app.get("/successful_logout", function(req, res){
  if(req.session.user == undefined){
    res.render("successful_logout");
  }
  else{
    res.render("error")
  }
});
*/

app.post("/signup", urlencodedParser, function(req, res){
  const username = req.body.username;
  const userpassword = req.body.password;
  const userpassword_check = req.body.password_check;

  if(userpassword !== userpassword_check){
    res.render("signup", {error_signup: "Your passwords do not match! Please try again"});
  }
  dbClient.query("SELECT * FROM users WHERE name = $1", [username], function(dbErr, dbRes){
    if (dbRes.rows.length > 0){
      res.render("signup", {error_signup: "Username already taken! Please choose a different one"});
    }
    else
    dbClient.query("INSERT INTO users (name, password) VALUES ($1, $2)", [username, userpassword], function(dbErr, dbRes){});
    res.redirect("/");
  });

});

app.post("/login", urlencodedParser, function(req, res){
  const username = req.body.username;
  const userpassword = req.body.password;

  dbClient.query("SELECT * FROM users WHERE name = $1 AND password = $2", [username, userpassword], function(dbErr, dbRes){
    if(dbRes.rows.length == 0){
      res.render("login", {error_login: "Username or Password wrong!"})
    }
    else{
      req.session.user = username;
      res.redirect("/");
    }
  });
});

app.get('/logout', function (req, res) {
  if(req.session.user != undefined)
    {
      req.session.destroy();
      loggedOut = true;
      res.redirect("/");
    }
  else{
    res.redirect("/");
  }
});

app.post("/search", urlencodedParser, function(req, res){
  const search = req.body.searchTerm;
  dbClient.query("SELECT * FROM books WHERE ")
});

app.listen(PORT, function () {
    console.log(`Shopping App listening on Port ${PORT}`);
});

app.get("/error", function(req, res){
  res.render("error");
});
//FIXIT
app.get("*", function(req, res){
  res.send("Error Page not Found");
});
