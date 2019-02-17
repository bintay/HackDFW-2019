// Includes
const path = require('path');
const fs = require('fs');
const uuid = require('uuid/v1');
const request = require('request');

// Set up express
const express = require('express');
const app = express();
const port = process.argv[2] || 12345;

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static('public'));

var multer  = require('multer');
var upload = multer({ dest: __dirname + '/public/uploads/' });
var type = upload.single('data');
var exec = require('child_process').exec;

app.get('/', function (req, res) {
   res.sendFile(__dirname + '/public/index.html');
});

app.post('/image/', type, function (req, res) {
   res.setHeader("Access-Control-Allow-Origin", "*");
   const id = uuid();
   fs.writeFile(__dirname + '/public/uploads/' + id + ".png", req.body.image, 'base64', function(err) {
      if (err) console.log(err);
      request.get('http://localhost:5000/classify/http://localhost:4321/public/uploads/' + id + '.png', function (err, res3, body) {
         console.log(body);
         body = parseInt(body);
         if (body == -1) {
            res.send(JSON.stringify({message: 'Error reading book cover. Please try again.'}));
         } else {
            console.log(body);
            request.post('http://localhost:4321/api/toggle/0/' + body + '/', function (err, res2, body) {
               const data = JSON.parse(body);
               res.send(JSON.stringify({message: `${data.book} was successfully checked ${data.checked}.`}));
            });
         }
      });
   });
});

app.listen(port, function () {
   console.log(`Listening on port ${port}`);
});
