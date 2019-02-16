var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var volunteeringSchema = new Schema({
   title: String,
   description: String,
   date: Date,
   location: String,
   people: Number,
   needPeople: Number
});

var Volunteering = mongoose.model('Volunteering', volunteeringSchema);

module.exports = Volunteering;
