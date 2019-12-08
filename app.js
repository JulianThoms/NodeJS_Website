var express = require("express");
var pg = require("pg");
var bodyParser = require("body-parser");
var session = require("express-session");
const bcrypt = require('bcrypt');
const saltRounds = 10;

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
  secret: "dwai2§dkjwao210dwkalcklxkd3d013ie2kdlkwla4i29keedlkccvoit32011",
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
    req.session.loggedIn = true;
    res.render("index", {loggedIn: req.session.loggedIn});
  }
  else{
    res.render("index", {loggedIn: false});
  }
});



app.get("/login", function(req, res){

  if(req.session.user != undefined){
    res.render("login", {loggedIn: req.session.loggedIn, username: req.session.user});
  }
  else{
    res.render("login", {loggedIn: false});
  }

});

app.get("/signup", function(req, res){
  if(req.session.user != undefined){
    res.render("signup", {loggedIn: req.session.loggedIn, username: req.session.user});
  }
  else{
    res.render("signup", {loggedIn: false});
  }
});


app.post("/signup", urlencodedParser, function(req, res){
  const username = req.body.username;
  const userpassword = req.body.password;
  const userpassword_check = req.body.password_check;
  const email = req.body.email;
  const security_question = req.body.security_question;

  if(userpassword !== userpassword_check){
    res.render("signup", {error_signup: "Your passwords do not match! Please try again"});
    return;
  }
  dbClient.query("SELECT * FROM users WHERE name = $1 OR email = $2", [username, email], function(dbErr, dbRes){
    if (dbRes.rows.length > 0){
      res.render("signup", {error_signup: "Username already taken! Please choose a different one"});
      return;
    }
    else{
      //this hashes password
      bcrypt.hash(userpassword, saltRounds, function(err, hash) {
        dbClient.query("INSERT INTO users (name, password, answer_passwort_reset, email) VALUES ($1, $2, $3, $4)", [username, hash, security_question, email], function(dbErr, dbRes){});
      });
    res.redirect("/login");
    return;
  }
  });

});

app.post("/login", urlencodedParser, function(req, res){
  const username = req.body.username;
  let userID;
  const userpassword = req.body.password;
  let hash;
  dbClient.query("SELECT id_user, password FROM users WHERE name = $1", [username], function(dbErr, dbRes){
    hash = dbRes.rows[0].password;
    userID = dbRes.rows[0].id_user;

  bcrypt.compare(userpassword, hash, function(errComp, resComp) {
    if(!resComp){
      res.render("login", {error_login: "Username or Password wrong!"})
      return;
    }
    else{
      req.session.userID = dbRes.rows[0].id_user;
      req.session.user = username;
      res.redirect("/");
      return;
    }
  });
  });
});

app.get('/forgotPassword', function(req, res){
  if(req.session.user == undefined)
  {
    res.render("forgotPassword");
  }
})

app.get('/logout', function (req, res) {
  if(req.session.user != undefined)
  {
    req.session.destroy();
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

//only logged in people can get/post this hopefully

app.get("/favourites", function (req, res){
  let favourites = "";

  let username = req.session.user;
  let id = req.session.userID;
  if(id != undefined){
    dbClient.query("SELECT books.title, books.id_book FROM (books INNER JOIN users_favourites ON books.id_book = users_favourites.id_book) INNER JOIN users ON users.id_user = users_favourites.id_user WHERE users.id_user = $1 LIMIT 50", [id], function(dbErr, dbRes){
      res.render("favourites", {
        favourites: dbRes.rows,
        username,
        loggedIn: req.session.loggedIn
      });
    });
  };
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
        res.render("search_results", {error_message: "Nothing found! Try some other term or start Browsing!", username, loggedIn: req.session.loggedIn});
        return;
      }
      else if(dbRes.rows.length == 0){
        res.render("search_results", {error_message: "Nothing found! Try some other term or start Browsing!", username, loggedIn: req.session.loggedIn});
        return;
      }
      else{
        res.render("search_results", {search_results: dbRes.rows, username, loggedIn: req.session.loggedIn});
        return;
      }
    });
  }
});


app.get("/search/:id", function (req, res) {
  /* List details about a single flight */
  const bookID = req.params.id;
  req.session.bookID = bookID;
  const userName = req.session.user;
  const userID = req.session.userID
  let isFavourite = false;
  let reviews;
  let no_reviews = false;
  //checks if book exists
  dbClient.query("SELECT * FROM users_favourites WHERE id_book = $1 AND id_user = $2", [bookID, userID], function(dbErrLookupIfFavourite, dbResLookupIfFavourite){
    if (dbResLookupIfFavourite.rows.length != 0){
      isFavourite = true;
  }});

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
      let reviewed = false;
      dbClient.query("SELECT * FROM users_reviews WHERE id_user = $1 AND id_book = $2", [userID, bookID], function (dbErrReviewDupCheck, dbResReviewDupCheck) {
        if(dbResReviewDupCheck.rows.length != 0){
          reviewed = true;
        }});
      dbClient.query("SELECT users_reviews.review, users.name FROM users_reviews INNER JOIN users ON users_reviews.id_user = users.id_user WHERE users_reviews.id_book=$1 AND users.id_user=$2", [bookID, userID], function (dbErrReview, dbResReview) {
        if(dbResReview.rows.length == 0){
          no_reviews = true;
        }
        else{
          reviews = dbResReview.rows;
        }
        res.render("book_closeup", {
          title: dbRes.rows[0].title,
          year: dbRes.rows[0].year,
          isbn: dbRes.rows[0].isbn,
          author: dbRes.rows[0].author,
          id_book: dbRes.rows[0].id_book,
          reviews,
          no_reviews: no_reviews,
          loggedIn: req.session.loggedIn,
          reviewed,
          isFavourite
        });
      });
    }
  });
});

  app.post("/addReview", urlencodedParser, function(req, res){
    userID = req.session.userID;
    bookID = req.session.bookID;
    review = req.body.userReview;
    if(review !=  ""){
    dbClient.query("INSERT INTO users_reviews(id_user, id_book, review) VALUES($1, $2, $3)", [userID, bookID, review], function(dbErr, dbRes){
      res.redirect("/search/"+bookID);
    });
  }});

  app.get("/secret", function(req, res){
    res.render("secret", {loggedIn: req.session.loggedIn});
  })


  app.post("/addFavourite", urlencodedParser, function(req, res){
    userID = req.session.userID;
    bookID = req.session.bookID;
    dbClient.query("SELECT * FROM users_favourites WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErrDupCheck, dbResDupCheck){
      if(dbResDupCheck.rows.length == 0){
        dbClient.query("INSERT INTO users_favourites(id_user, id_book) VALUES($1, $2)", [userID, bookID], function(dbErr, dbRes){
          if(dbErr == undefined){
            res.redirect("/search/"+bookID);
          }
          else{
            res.redirect("/error", 500);
          }
    })
    }
  })
});

app.post("/removeFavourite", urlencodedParser, function(req, res){
  userID = req.session.userID;
  bookID = req.session.bookID;
  dbClient.query("SELECT * FROM users_favourites WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErrDupCheck, dbResDupCheck){
    if(dbResDupCheck.rows.length == 1){
      dbClient.query("DELETE FROM users_favourites WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErr, dbRes){
        if(dbErr == undefined){
          res.redirect("/search/"+bookID);
        }
        else{
          res.redirect("/error", 500);
        }
  })
  }
})
});


//Catches wrong pages
app.get("*", function(req, res){
  res.render("error", {error_message: "This page does not exist!", loggedIn: req.session.loggedIn})
});





//END OF GET/POST

app.listen(PORT, function () {
  console.log(`Shopping App listening on Port ${PORT}`);
});
