var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var userSchema = new Schema({
   name: String,
   password: String,
   email: {type: String, unique: true},
   volunteering: [ ObjectId ],
   canAdd: { type: Boolean, default: false }
});

var User = mongoose.model('User', userSchema);

module.exports = User;
