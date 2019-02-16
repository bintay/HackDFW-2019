const PORT = 4321;

const express = require('express');
const app = express();

app.use('/public', express.static('public'));

app.get('/', function (req, res) {
   res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, function () {
   console.log(`App listening on port ${PORT}`);
});
