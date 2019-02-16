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
const Volunteering = require('./models/Volunteering.js');

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
   let signedUp = {};
   
   if (req.user) {
      for (let i = 0; i < req.user.volunteering.length; ++i) {
         signedUp[req.user.volunteering[i]] = true;
      }
   }

   res.render('index', { signedUp: JSON.stringify(signedUp).replace(/"/g, "'"), canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined });
});

// login
app.get('/login', redirectIfLoggedIn, csrfProtection, function (req, res) {
   res.render('login', {canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, csrfToken: req.csrfToken()});
});

// register
app.get('/register', redirectIfLoggedIn, csrfProtection, function (req, res) {
   res.render('register', {canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, csrfToken: req.csrfToken()});
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

// profile
app.get('/profile', redirectIfLoggedOut, function (req, res) {
   Volunteering.find({_id: {$in: req.user.volunteering}}, function (err, vols) {
      if (err) console.log(err);
      vols = vols.map(vols => {
         vols.dateString = (new Date(vols.date)).toDateString();
         return vols;
      });
      res.render('profile', { canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, name: req.user.name, email: req.user.email, volunteering: vols });
   })
});

// add volunteering
app.get('/add', redirectIfLoggedOut, csrfProtection, function (req, res) {
   res.render('add', { canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, csrfToken: req.csrfToken() });
});

app.get('/api/volunteerings/', function (req, res) {
   Volunteering.find({}, function (err, vols) {
      if (err) console.log(err);
      res.send(JSON.stringify(vols));
   });
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
         res.render('login', { canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, errors: ['Incorrect email.'], csrfToken: req.csrfToken() })
      } else {
         bcrypt.compare(req.body.password, user.password, function (err, match) {
            if (err) {
               console.log(err);
            }
            if (match) {
               req.session.userid = user._id;
               res.redirect('/');
            } else {
               res.render('login', { canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, errors: ['Incorrect password.'], csrfToken: req.csrfToken() });
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
         res.render('register', { canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, errors: signupErrors, csrfToken: req.csrfToken() });
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

// new volunteering
app.post('/add', redirectIfLoggedOut, csrfProtection, function (req, res) {
   let errors = [];

   if (!req.user.canAdd) res.redirect('/');

   if (req.body.title == '') {
      errors.push('Title cannot be empty');
   }

   if (req.body.desc == '') {
      errors.push('Description cannot be empty');
   }

   if (req.body.location == '') {
      errors.push('Location cannot be empty');
   }

   if (req.body.people < 1) {
      errors.push('Should have at least one person');
   }

   if (errors.length == 0) {
      Volunteering.create({ title: req.body.title, description: req.body.desc, location: req.body.location, date: req.body.date, needPeople: req.body.people, people: 0 }, function (err, vol) {
         if (err) console.log(err);

         res.redirect('/');
      });
   } else {
      res.render('add', { errors: errors, canAdd: req.user && req.user.canAdd, loggedOut: req.session.userid == undefined, csrfToken: req.csrfToken() });
   }
});

// join volunteering

app.post('/join', redirectIfLoggedOut, function (req, res) {
   let errors = [];
   Volunteering.find({_id: req.body.volID }, function (err, vols) {
      let volunteering = vols[0];
      if (volunteering.people >= volunteering.needPeople) {
         errors.push('Volunteering full');
      }

      if (errors.length == 0) {
         Volunteering.findOneAndUpdate({_id: req.body.volID}, {$inc: {people: 1}}, function (err, vols) {
            if (err) console.log(err);
            console.log(vols);
            User.updateOne({_id: req.user._id}, {$push: {volunteering: vols._id}}, function (err, user) {
               if (err) console.log(err);
               res.send(JSON.stringify({done: true}));
            });
         });
      } else {
         res.send(JSON.stringify(errors));
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
