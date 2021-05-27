var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");


var FineSchema = new mongoose.Schema({
	cust: String,
	cancellation: String,
	amount: Number
});

FineSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Fine", FineSchema);