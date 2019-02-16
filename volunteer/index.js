const PORT = 4321;

// Express Config
const express = require('express');
const app = express();
app.use('/public', express.static('public'));
const exphbs  = require('express-handlebars');
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// Database Config
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/homeless');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => console.log('Database connected'));
const User = require('./models/User.js');

// CSRF Protection
const csurf = require('csurf');
csrfProtection = csurf();

// Other Libraries
const bcrypt = require('bcrypt-nodejs');
const session = require('express-session');

// Body parser
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions
app.use(session({
   name: 'server-session-cookie-id',
   secret: 'angel fish sunshine shooting star',
   saveUninitialized: false,
   resave: false,
   cookie: {
      maxAge: 3600000 * 24 * 7 * 2 // 2 weeks
   }
}));

// Get user data
app.use(function (req, res, next) {
   if (req.session.userid) {
      User.find({ _id: req.session.userid }, function (err, users) {
         var user = users[0];
         user.password = null;
         delete user.password;
         req.user = user;
         next();
      });
   } else {
      next();
   }
});
/*
   Get Requests
*/

// index
app.get('/', function (req, res) {
   res.render('index', { loggedOut: req.session.userid == undefined });
});

// login
app.get('/login', redirectIfLoggedIn, csrfProtection, function (req, res) {
   res.render('login', {loggedOut: req.session.userid == undefined, csrfToken: req.csrfToken()});
});

// register
app.get('/register', redirectIfLoggedIn, csrfProtection, function (req, res) {
   res.render('register', {loggedOut: req.session.userid == undefined, csrfToken: req.csrfToken()});
});

// logout
app.get('/logout/', redirectIfLoggedOut, function (req, res) {
   if (req.session) {
      req.session.destroy(function (err) {
         if (err) {
            console.log(err);
         }
         res.redirect('/');
      });
   } else {
      res.redirect('/');
   }
});

/*
   Post requests
*/

// login
app.post('/login/', redirectIfLoggedIn, csrfProtection, function (req, res) {
   User.find({ 'email': req.body.email }, function (err, users) {
      if (err) {
         console.log(err);
      }
      
      var user = users[0];

      if (user == null) {
         res.render('login', { loggedOut: req.session.userid == undefined, errors: ['Incorrect email.'], csrfToken: req.csrfToken() })
      } else {
         bcrypt.compare(req.body.password, user.password, function (err, match) {
            if (err) {
               console.log(err);
            }
            if (match) {
               req.session.userid = user._id;
               res.redirect('/');
            } else {
               res.render('login', { loggedOut: req.session.userid == undefined, errors: ['Incorrect password.'], csrfToken: req.csrfToken() });
            }
         });
      }
   });
});

// sign up
app.post('/register/', redirectIfLoggedIn, csrfProtection, function (req, res) {
   var signupErrors = [];

   if (!validateEmail(req.body.email)) {
      signupErrors.push('Email invalid.');
   }

   if (req.body.password.length < 8) {
      signupErrors.push('Password too short: please use at least 8 characters.');
   }

   User.find({ 'email': req.body.email }, function (err, users1) {
      if (err) {
         console.log(err);
      }

      if (users1.length != 0) {
         signupErrors.push('That email is already in use.');
      }

      if (signupErrors.length > 0) {
         res.render('register', { loggedOut: req.session.userid == undefined, errors: signupErrors, csrfToken: req.csrfToken() });
      } else {
         bcrypt.hash(req.body.password, null, null, function (err, hash) {
            User.create({ password: hash, email: req.body.email, name: req.body.name }, function (err, user) {
               if (err) {
                  console.log(err);
               }

               req.session.userid = user._id;
               res.redirect('/');
            });
         });
      }
   });
});

// Start the server
app.listen(PORT, function () {
   console.log(`App listening on port ${PORT}`);
});

/*
   Helpers
*/


function validateEmail (email) {
   var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
   return re.test(email.toLowerCase());
}

function validateUsername (username) {
   var re = /^[A-Za-z0-9._]+$/
   return re.test(username);
}

function redirectIfLoggedIn (req, res, next) {
   if (req.session.userid) {
      res.redirect('/');
   } else {
      next();
   }
}

function redirectIfLoggedOut (req, res, next) {
   if (!req.session.userid) {
      res.redirect('/login/');
   } else {
      next();;
   }
}
