var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var passport = require("passport");
var bodyParser = require("body-parser");
var User = require("./models/user");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var	autoIncrement = require("mongoose-auto-increment");
var	methodOverride = require("method-override");



mongoose.connect("mongodb://localhost:27017/canteen");
mongoose.set('useNewUrlParser', true);

var app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride("_method"));


//=========== PASSPORT CONFIGURATION ===========
app.use(require("express-session")({
	secret: "This is a Secret Text", //decode and encode
	resave: false,
	saveUninitialized:false
}));

//ask node to use passsport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.deserializeUser(User.deserializeUser()); //for decoding
passport.serializeUser(User.serializeUser()); //for encoding

// mongoose/model config
var manageSchema = new mongoose.Schema({
	sr_no: {type:Number,default:0},
	item_id: String,
	item_name: String,
	item_cost: Number,
	item_status: String
});

//autoincrementing config
autoIncrement.initialize(mongoose.connection);
manageSchema.plugin(autoIncrement.plugin, {
  model: "CanteenManager", // collection or table name in which you want to apply auto increment
  field: "sr_no", // field of model which you want to auto increment
  startAt: 1, // start your auto increment value from 1
  incrementBy: 1, // incremented by 1
});

var CanteenManager =  mongoose.model("CanteenManager", manageSchema);

// Admin.create({
// 	sr:1,
// 	item_id: "c01",
// 	item_name: "pizza",
// 	item_cost: 80,
// 	item_status: "availabe"
// });

//=========  ROUTES  ==============
app.get("/", function(req, res){
	res.render("front");
});
app.get("/login", function(req,res){
	res.render("login");
});
// MAIN MENU
app.get("/index", function(req, res){
	CanteenManager.find({}, function(err, items){
		if(err){
			console.log("error" +err);
		} else{
			res.render("index", {item:items});
		}
	});
});

// ADD NEW ITEM
app.get("/add", function(req, res){
	res.render("add");
});
app.post("/index", function(req, res){
	CanteenManager.create(req.body.item, function(err, newItem){
		if (err){
			res.render("add");
		} else{
			res.redirect("/index");
		}
	});
});
// MANAGE ITEM (SHOW)
app.get("/index/:id", function(req, res){
	CanteenManager.findById(req.params.id, function(err, foundItem){
		if(err){
			res.redirect("/index");
		} else{
			res.render("manage", {item:foundItem});
		}
	});
});

// EDIT ITEM 
app.get("/index/:id/update", function(req, res){
	CanteenManager.findById(req.params.id, function(err, editItem){
		if(err){
			res.redirect("/index");
		} else{
			res.render("update", {item:editItem});
		}
	});
});

// UPDATE ITEM
app.put("/index/:id", function(req, res){
	CanteenManager.findByIdAndUpdate(req.params.id, req.body.item, function(err, updateItem){
		if (err){
			res.redirect("/update");
		} else{
			res.redirect("/index");
			console.log("item updated");
		}
	});
});

// DELETE ITEM
app.delete("/index/:id", function(req, res){
	CanteenManager.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/manage");
		} else{
			res.redirect("/index");
			console.log("Item Deleted");
		}
	});
});

app.get("/data", function(req, res){
	res.render("data");
});
app.get("/accept", function(req, res){
	res.render("accept");
});
//CUSTOMERS PAGE
// PLACE ORDER
app.get("/place", function(req, res){
	CanteenManager.find({}, function(err, items){
		if(err){
			console.log("error" +err);
		} else{
			res.render("place", {item:items});
		}
	});
});

app.post("/place", function(req, res){
	CanteenManager.create(req.body.item, function(err, newItem){
		if (err){
			res.render("/index");
		} else{
			res.redirect("/place");
		}
	});
});
// ORDER
app.get("/cart", function(req, res){
	app.render("cart");
});
app.get("/cart/:id", function(req, res){
	CanteenManager.findByIdAndUpdate(req.params.id, function(err, foundItem){
		if(err){
			res.redirect("/index");
		} else{
			res.render("cart", {item:foundItem});
		}
	});
});



app.get("/history", function(req, res){
	res.render("history");
});

//=========== AUTH ROUTES  ================
app.get("/register",function(req,res){
	res.render("register");
});




app.listen(3000, function(err){
	if (err){
		console.log(err);
	} else{
		console.log("Server has started on port 3000...");
	}
});