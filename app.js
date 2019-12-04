var express = require("express");
var pg = require("pg");
var bodyParser = require("body-parser");
var session = require("express-session");
let loggedIn = false;
var CON_STRING = process.env.DB_CON_STRING;
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
  req.session.loggedIn = true;
  res.render("index", {loggedIn});
});
app.get("/login", function(req, res){
  res.render("login");
});
app.get("/signup", function(req, res){
  res.render("signup");
});
app.get("/successful_login", function(req, res){
  res.render("successful_login");
});

app.post("/signup", urlencodedParser, function(req, res){
  var username = req.body.username;
  var userpassword = req.body.password;
  dbClient.query("INSERT INTO users (name, password) VALUES ($1, $2)", [username, userpassword], function(dbErr, dbRes){});
  res.redirect("/");
});

app.post("/login", urlencodedParser, function(req, res){
  var username = req.body.username;
  var userpassword = req.body.password;

  dbClient.query("SELECT * FROM users WHERE name = $1 AND password = $2", [username, userpassword], function(dbErr, dbRes){
    if(dbRes.rows.length == 0){
      res.render("login", {error_login: "Username or Password wrong!"})
    }
    else{
      res.redirect("/successful_login");
    }

  });
});

app.listen(PORT, function () {
    console.log(`Shopping App listening on Port ${PORT}`);
});
