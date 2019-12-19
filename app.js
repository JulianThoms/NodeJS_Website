var express = require("express");
var pg = require("pg");
var bodyParser = require("body-parser");
var session = require("express-session");
const bcrypt = require('bcryptjs');
//const nodemailer = require("nodemailer");
//let transporter = nodemailer.createTransport(transport[, defaults]); //only one required
const saltRounds = 10;
var googlebooks = require('google-books-search');

var options = {
  field: 'isbn',
  offset: 0,
  limit: 1
};

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
  resave: true,
  cookie: {
    maxAge: 3600000
  }, //time in millisecs before cookie expires
  saveUninitialized: false
}));


//allowing CSS
app.use(express.static(__dirname + '/public'));

app.set("views", "views");
app.set("view engine", "pug");


app.get("/", function(req, res) {
  if (req.session.user != undefined) {
    req.session.loggedIn = true;
    res.render("index", {
      loggedIn: req.session.loggedIn,
      username: req.session.user
    });
  } else {
    res.render("index", {
      loggedIn: false
    });
  }
});

app.get("/impressum", function(req, res) {
  res.render("impressum", {
    loggedIn: req.session.loggedIn,
    username: req.session.user
  });
});

app.get("/login", function(req, res) {

  if (req.session.user != undefined) {
    res.render("login", {
      loggedIn: req.session.loggedIn,
      username: req.session.user
    });
  } else {
    res.render("login", {
      loggedIn: false
    });
  }
});

app.get("/signup", function(req, res) {
  res.render("signup", {
    loggedIn: req.session.loggedIn,
    username: req.session.user
  });
});


app.post("/signup", urlencodedParser, function(req, res) {
  const username = req.body.username;
  const userpassword = req.body.password;
  const userpassword_check = req.body.password_check;
  const email = req.body.email;
  const security_question = req.body.security_question;

  if (userpassword !== userpassword_check) {
    res.render("signup", {
      error_signup: "Your passwords do not match! Please try again"
    });

  } else {
    dbClient.query("SELECT * FROM users WHERE name = $1 OR email = $2", [username, email], function(dbErr, dbRes) {
      if (dbRes.rows.length > 0) {
        res.render("signup", {
          error_signup: "Username already taken! Please choose a different one"
        });
      } else {
        //this hashes password
        bcrypt.hash(userpassword, saltRounds, function(err, hash) {
          dbClient.query("INSERT INTO users (name, password, answer_passwort_reset, email) VALUES ($1, $2, $3, $4)", [username, hash, security_question, email], function(dbErr, dbRes) {
            if (dbErr != undefined) {
              console.log(dbErr);
              res.redirect("/error");
            } else {
              res.redirect("/login");
            }
          });
        });
      }
    });
  }
});

app.post("/login", urlencodedParser, function(req, res) {
  const username = req.body.username;
  let userID;
  const userpassword = req.body.password;
  let hash;
  dbClient.query("SELECT id_user, password FROM users WHERE name = $1", [username], function(dbErr, dbRes) {
    if (username == "" || dbRes.rows.length == 0 || dbErr != undefined) {
      res.render("login", {
        error_login: "Username or Password wrong!"
      })
    } else {
      hash = dbRes.rows[0].password;
      userID = dbRes.rows[0].id_user;

      bcrypt.compare(userpassword, hash, function(errComp, resComp) {
        if (!resComp) {
          res.render("login", {
            error_login: "Username or Password wrong!"
          })

        } else {
          req.session.userID = dbRes.rows[0].id_user;
          req.session.user = username;
          res.redirect("/");
        }
      });
    }
  });
});

app.get('/forgotPassword', function(req, res) {
  if (req.session.user == undefined) {
    res.render("forgotPassword");
  }
});

app.post("/forgotPassword", urlencodedParser, function(req, res) {
  const username = req.body.username;
  const userEmail = req.body.email;
  const userSecret = req.body.answer_passwort_reset;
  const userPassword = req.body.password;

  if (userPassword !== req.body.password_check) {
    res.render("forgotPassword", {
      error_forgot_password: "Your passwords do not match! Please try again"
    });
  } else {
    dbClient.query("SELECT * FROM users WHERE name = $1 AND email = $2 AND answer_passwort_reset = $3", [username, userEmail, userSecret], function(dbErr, dbRes) {
      if (dbRes.rows.length == 1) {
        id_user = dbRes.rows[0].id_user;
        bcrypt.hash(userPassword, saltRounds, function(err, hash) {
          dbClient.query("UPDATE users SET password = $1 WHERE id_user = $2", [hash, id_user], function(dbErr, dbRes) {
            if (dbErr == undefined) {
              res.render("login", {
                passwordUpdated: true
              });
            } else {
              res.render("error", {
                error_message: "An Error occured. Please try again later!"
              })
            }
          });
        });
      } else {
        res.render("forgotPassword", {
          error_forgot_password: "Username, Email or Secret Question wrong!"
        });
      }
    });
  }
});


app.get("/logout", function(req, res) {
  if (req.session.user != undefined) {
    req.session.destroy();
    res.render("index", {
      loggedOut: true
    })
  } else {
    res.redirect("/");
  }
});

app.get("/error", function(req, res) {
  res.render("error");
});


//STOPS LOGGED-OUT PEOPLE FROM ACCESSING BELOW PAGES
app.get("*", function(req, res, next) {

  if (req.session.user == undefined) {
    res.render("error", {
      error_message: "You have to be logged in to see this page!"
    });
  } else {
    next();
  }
});

app.post("*", function(req, res, next) {
  if (req.session.user == undefined) {
    res.render("error", {
      error_message: "You have to be logged in to see this page!"
    });
  } else {
    next();
  }
});

//only logged in people can get/post this hopefully


app.get("/browse", function(req, res) {

  dbClient.query("SELECT * FROM books TABLESAMPLE SYSTEM (5) LIMIT 51", function(dbErr, dbRes) {
    if (dbRes.rows.length > 0) {
      res.render("browse", {
        books: dbRes.rows,
        loggedIn: req.session.loggedIn,
        username: req.session.user
      })
    } else {
      res.render("error", {
        error_message: "No books found. Please refresh to try again!",
        loggedIn: true,
        refreshBrowse: true,
        username: req.session.user
      });
    }
  })
})

app.get("/account", function(req, res) {

  res.render("account", {
    loggedIn: req.session.loggedIn,
    username: req.session.user
  })
});


app.get("/favourites", function(req, res) {
  let favourites = "";
  let username = req.session.user;
  let id = req.session.userID;
  if (id != undefined) {
    dbClient.query("SELECT books.title, books.id_book FROM (books INNER JOIN users_favourites ON books.id_book = users_favourites.id_book) INNER JOIN users ON users.id_user = users_favourites.id_user WHERE users.id_user = $1 LIMIT 50", [id], function(dbErr, dbRes) {
      res.render("favourites", {
        favourites: dbRes.rows,
        username,
        loggedIn: req.session.loggedIn
      });
    });
  };
});

app.post("/search", urlencodedParser, function(req, res) {
  let username = req.session.user;
  const search = req.body.searchTerm;
  if (search == "") {
    res.redirect("/");

  } else {
    dbClient.query("SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 OR year = $3 OR isbn LIKE $2 LIMIT 50", ['%' + search + '%', search + '%', search], function(dbErr, dbRes) {
      if (dbRes == undefined) {
        res.render("search_results", {
          error_message: "Nothing found! Try some other term or start Browsing!",
          username,
          loggedIn: req.session.loggedIn,
          username: req.session.user
        });

      } else if (dbRes.rows.length == 0) {
        res.render("search_results", {
          error_message: "Nothing found! Try some other term or start Browsing!",
          username,
          loggedIn: req.session.loggedIn,
          username: req.session.user
        });

      } else {
        res.render("search_results", {
          search_results: dbRes.rows,
          username,
          loggedIn: req.session.loggedIn,
          username: req.session.user
        });

      }
    });
  }
});

//Next time I'll make a books object to store all those variables in, I promise.

app.get("/search/:id", function(req, res) {

  const bookID = req.params.id;
  req.session.bookID = bookID;
  const username = req.session.user;
  const userID = req.session.userID
  let isFavourite = false;
  let reviews;
  let no_reviews = false;
  let image;
  let averageRating;


  dbClient.query("SELECT * FROM users_favourites WHERE id_book = $1 AND id_user = $2", [bookID, userID], function(dbErrLookupIfFavourite, dbResLookupIfFavourite) {
    if (!dbErrLookupIfFavourite && dbResLookupIfFavourite.rows.length != 0) {
      isFavourite = true;
    }
  });

  dbClient.query("SELECT * FROM books WHERE id_book=$1", [bookID], function(dbErr, dbRes) {
    if (dbErr != undefined) {
      res.redirect("/error");
    } else
    if (dbRes.rows.length == 0) {
      res.redirect("/error");
    } else {

      let reviewed = false;
      dbClient.query("SELECT * FROM users_reviews WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErrReviewDupCheck, dbResReviewDupCheck) {
        if (dbErrReviewDupCheck || dbResReviewDupCheck.rows.length != 0) {
          reviewed = true;
        }

        dbClient.query("SELECT avg(rating) FROM users_reviews WHERE id_book = $1", [bookID], function(errAvg, resAvg) {
          averageRating = resAvg.rows[0].avg;


          dbClient.query("SELECT users_reviews.review, users_reviews.rating, users.name FROM users_reviews INNER JOIN users ON users_reviews.id_user = users.id_user WHERE users_reviews.id_book=$1", [bookID], function(dbErrReview, dbResReview) {
            if (dbErrReview || dbResReview.rows.length == 0) {
              no_reviews = true;
            }
            reviews = dbResReview.rows;
            googlebooks.search(dbRes.rows[0].isbn, options, function(error, results) {
              results = results[0];

              if (results == undefined) {
                console.log("nothing found, searching deeper")
                googlebooks.search(dbRes.rows[0].title, function(errorTwo, resultsTwo) {
                  results = resultsTwo[0];

                  res.render("book_closeup", {
                    id_book: dbRes.rows[0].id_book,
                    book: dbRes.rows[0],
                    reviews,
                    no_reviews: no_reviews,
                    loggedIn: req.session.loggedIn,
                    reviewed,
                    results,
                    isFavourite,
                    averageRating,
                    username: req.session.user
                  });
                });
              } else {
                res.render("book_closeup", {
                  id_book: dbRes.rows[0].id_book,
                  book: dbRes.rows[0],
                  reviews,
                  no_reviews: no_reviews,
                  loggedIn: req.session.loggedIn,
                  reviewed,
                  results,
                  isFavourite,
                  averageRating,
                  username: req.session.user
                });
              }
            });
          })
        });
      });
    }
  });
});

app.post("/searchRandom", urlencodedParser, function(req, res) {
  let randomBookID;
  dbClient.query("SELECT id_book FROM books ORDER BY RANDOM() LIMIT 1", function(dbErr, dbRes) {
    if (!dbErr) {
      randomBookID = dbRes.rows[0].id_book;
      res.redirect("/search/" + randomBookID);
    }
  })
})

app.post("/addReview", urlencodedParser, function(req, res) {
  userID = req.session.userID;
  bookID = req.session.bookID;
  review = req.body.userReview;
  rating = req.body.rating;
  if (review != "") {
    dbClient.query("INSERT INTO users_reviews(id_user, id_book, review, rating) VALUES($1, $2, $3, $4)", [userID, bookID, review, rating], function(dbErr, dbRes) {
      res.redirect("/search/" + bookID);
    });
  } else {
    res.redirect("/error");
  }
});


app.post("/addFavourite", urlencodedParser, function(req, res) {
  userID = req.session.userID;
  bookID = req.session.bookID;
  dbClient.query("SELECT * FROM users_favourites WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErrDupCheck, dbResDupCheck) {
    if (dbResDupCheck.rows.length == 0) {
      dbClient.query("INSERT INTO users_favourites(id_user, id_book) VALUES($1, $2)", [userID, bookID], function(dbErr, dbRes) {
        if (dbErr == undefined) {
          res.redirect("/search/" + bookID);
        } else {
          res.redirect("/error", 500);
        }
      })
    }
  })
});

app.post("/removeFavourite/:id/:where", urlencodedParser, function(req, res) {
  userID = req.session.userID;
  bookID = req.params.id;
  where = req.params.where;
  console.log(where)
  dbClient.query("SELECT * FROM users_favourites WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErrDupCheck, dbResDupCheck) {
    if (dbResDupCheck.rows.length == 1) {
      dbClient.query("DELETE FROM users_favourites WHERE id_user = $1 AND id_book = $2", [userID, bookID], function(dbErr, dbRes) {
        if (dbErr == undefined) {
          if (where == "favourites") {
            res.redirect("/favourites");
          } else {
            res.redirect("/search/" + bookID);
          }
        } else {
          res.redirect("/error", 500);
        }
      })
    }
  })
});

app.post("/changePassword", urlencodedParser, function(req, res) {
  input = {
    name: req.session.user,
    currentPassword: req.body.password_current,
    newPassword: req.body.password,
    newPasswordCheck: req.body.password_check
  }

  if (input.newPassword !== input.newPasswordCheck) {
    res.render("account", {
      error_password: "New Passwords don't match!",
      username: req.session.user
    });
  } else {
    dbClient.query("SELECT id_user, password FROM users WHERE name = $1", [input.name], function(dbErr, dbRes) {
      if (dbRes.rows.length == 0 || dbErr != undefined) {
        res.render("error", {
          error_message: "Something went wrong!"
        })
      } else {
        hash = dbRes.rows[0].password;
        userID = dbRes.rows[0].id_user;
        bcrypt.compare(input.currentPassword, hash, function(errComp, resComp) {
          if (!resComp) {
            res.render("account", {
              error_password: "Current Password doesn't match!",
              username: req.session.user
            })
          } else {
            bcrypt.hash(input.newPassword, saltRounds, function(err, hash) {
              dbClient.query("UPDATE users SET password = $1 WHERE id_user = $2", [hash, userID], function(dbErr, dbRes) {
                if (dbErr == undefined) {
                  res.render("account", {
                    passwordUpdated: true,
                    loggedIn: req.session.loggedIn,
                    username: req.session.user
                  });
                } else {
                  res.render("error", {
                    error_message: "An Error occured. Please try again later!",
                    username: req.session.user
                  })
                }
              });
            });
          }
        });
      }
    });
  }
})

app.post("/changeEmail", urlencodedParser, function(req, res) {
  input = {
    name: req.session.user,
    currentPassword: req.body.password_current,
    newEmail: req.body.email
  }

  dbClient.query("SELECT id_user, password FROM users WHERE name = $1", [input.name], function(dbErr, dbRes) {
    if (dbRes.rows.length == 0 || dbErr != undefined) {
      res.render("error", {
        error_message: "Something went wrong!",
        username: req.session.user
      })
    } else {
      dbClient.query("SELECT id_user FROM users WHERE email = $1", [input.newEmail], function(dbDupErr, dbDupRes) {
        if (dbDupRes.rows.length != 0) {
          res.render("account", {
            error_email: "New Email already in use!",
            username: req.session.user
          })
        } else {
          hash = dbRes.rows[0].password;
          userID = dbRes.rows[0].id_user;
          bcrypt.compare(input.currentPassword, hash, function(errComp, resComp) {
            if (!resComp) {
              res.render("account", {
                error_email: "Current Password doesn't match!",
                username: req.session.user
              })
            } else {
              dbClient.query("UPDATE users SET email = $1 WHERE id_user = $2", [input.newEmail, userID], function(dbErr, dbRes) {
                if (dbErr == undefined) {
                  res.render("account", {
                    emailUpdated: true,
                    loggedIn: req.session.loggedIn,
                    username: req.session.user
                  });
                } else {
                  res.render("error", {
                    error_message: "An Error occured. Please try again later!",
                    loggedIn: req.session.loggedIn,
                    username: req.session.user
                  })
                }
              });
            }
          });
        }
      })
    }
  });
})


//Catches wrong pages
app.get("*", function(req, res) {
  res.render("error", {
    error_message: "This page does not exist!",
    loggedIn: req.session.loggedIn,
    username: req.session.user
  })
});





//END OF GET/POST

app.listen(PORT, function() {
  console.log(`Shopping App listening on Port ${PORT}`);
});
