var express = require("express");
var pg = require("pg");
var bodyParser = require("body-parser");
var session = require("express-session");

global.loggedIn = false;
global.loggedOut = false;

const CON_STRING = process.env.DB_CON_STRING || "postgres://lqkivzqdzcaalr:78e9f45f9f4195a0fa11636e58447dd83ef914c0626af5ef55c12177af0e1c5b@ec2-54-75-235-28.eu-west-1.compute.amazonaws.com:5432/dc0kk7vjlc3fti";
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
    res.render("signup", {loggedIn, username});
  }
  else{
    loggedIn = false;
    res.render("signup", {loggedIn});
  }
});


app.post("/signup", urlencodedParser, function(req, res){
  const username = req.body.username;
  const userpassword = req.body.password;
  const userpassword_check = req.body.password_check;

  if(userpassword !== userpassword_check){
    res.render("signup", {error_signup: "Your passwords do not match! Please try again"});
    return;
  }
  dbClient.query("SELECT * FROM users WHERE name = $1", [username], function(dbErr, dbRes){
    if (dbRes.rows.length > 0){
      res.render("signup", {error_signup: "Username already taken! Please choose a different one"});
      return;
    }
    else
    dbClient.query("INSERT INTO users (name, password) VALUES ($1, $2)", [username, userpassword], function(dbErr, dbRes){});
    res.redirect("/");
    return;
  });

});

app.post("/login", urlencodedParser, function(req, res){
  const username = req.body.username;
  const userpassword = req.body.password;

  dbClient.query("SELECT * FROM users WHERE name = $1 AND password = $2", [username, userpassword], function(dbErr, dbRes){
    if(dbRes.rows.length == 0){
      res.render("login", {error_login: "Username or Password wrong!"})
      return;
    }
    else{
      req.session.user = username;
      res.redirect("/");
      return;
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

app.get("/error", function(req, res){
  res.render("error");
});


//STOPS LOGGED-OUT PEOPLE FROM ACCESSING BELOW PAGES
app.get("*", function(req, res, next){
  if(req.session.user == undefined){
    res.render("error", {error_message: "You have to be logged in to see this page!"});
  }
  else{
    next();
  }
});

app.post("*", function(req, res, next){
  if(req.session.user == undefined){
    res.render("error", {error_message: "You have to be logged in to see this page!"});
  }
  else{
    next();
  }
});

app.get("/favourites", function (req, res){
  let favourites = "";
  let username = req.session.user;
  dbClient.query("SELECT id_user FROM users WHERE name = $1", [username], function(dbErr, dbRes){
    if(dbRes.rows != 1){
      //FIXIT
      res.render("favourites", {favourites: "", username})
      return;
    }
    let id = dbRes.rows[0].id_user;
    if(id != undefined){
      dbClient.query("SELECT books.title FROM (books INNER JOIN users_favourites ON books.id_book = users_favourites.id_book) INNER JOIN users ON users.id_user = users_favourites.id_user WHERE users.id_user = $1 LIMIT 50", [id], function(dbErr, dbRes){
        res.render("favourites", {
          favourites: dbRes.rows, username
        });
      });
    }});
  });

app.post("/search", urlencodedParser, function(req, res){
  let username = req.session.user;
  const search = req.body.searchTerm;
  if(search == ""){
    res.redirect("/");
    return;
  }
  else{
    dbClient.query("SELECT * FROM books WHERE title LIKE $1 OR author LIKE $1 OR year = $1 OR isbn LIKE $2 LIMIT 50", ['%'+search+'%', search+'%'], function(dbErr, dbRes){
      if(dbRes == undefined){
        console.log(dbErr);
        res.render("search_results", {error_message: "Nothing found! Try some other term or start Browsing!", username});
        return;
      }
      else if(dbRes.rows.length == 0){
        res.render("search_results", {error_message: "Nothing found! Try some other term or start Browsing!", username});
        return;
      }
      else{
        res.render("search_results", {search_results: dbRes.rows, username});
        return;
      }
    });
  }
});

app.get("/search/:id", function (req, res) {
    /* List details about a single flight */
    var bookID = req.params.id;

    dbClient.query("SELECT * FROM books WHERE id_book=$1", [bookID], function (dbErr, dbRes) {
      if (dbErr != undefined){
        res.render("error", {error_message: "Error, please try again!"});
      } else
        if (dbRes.rows.length == 0) {
            res.render("error", {
                error_message: "This book does not exist!"
            });
          }
        else{
          res.render("book_closeup", {
              title: dbRes.rows[0].title,
              year: dbRes.rows[0].year,
              isbn: dbRes.rows[0].isbn,
              author: dbRes.rows[0].author
        }
      )}
    });
  });

app.get("/secret", function(req, res){
  res.render("secret");
})

app.listen(PORT, function () {
  console.log(`Shopping App listening on Port ${PORT}`);
});


//FIXIT
app.get("*", function(req, res){
  res.render("error", {error_message: "This page does not exist!"})
});
