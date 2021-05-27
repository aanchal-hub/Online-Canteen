// ====== PACKAGES ============
var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var passport = require("passport");
var bodyParser = require("body-parser");
var User = require("./models/user");
var Fine = require("./models/fine");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var	autoIncrement = require("mongoose-auto-increment");
var	methodOverride = require("method-override");
var flash = require('express-flash-messages');


mongoose.connect("mongodb://localhost:27017/canteen");
mongoose.set('useNewUrlParser', true);

// ======== CONFIGURATION ==========
var app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride("_method"));
app.use(flash());

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
passport.serializeUser(User.serializeUser()); //for encoding
passport.deserializeUser(User.deserializeUser()); //for decoding

app.use(function(req,res,next)
{
	res.locals.currentUser=req.user;
	next();
})

// mongoose/model config ===== ITEM MODEL====
var itemSchema = new mongoose.Schema({
	sr_no: {type:Number,default:0},
	item_name: String,
	item_cost: Number,
	item_status: String,
});

//autoincrementing config
autoIncrement.initialize(mongoose.connection);
itemSchema.plugin(autoIncrement.plugin, {
  model: "Item", // collection or table name in which you want to apply auto increment
  field: "sr_no", // field of model which you want to auto increment
  startAt: 1, // start your auto increment value from 1
  incrementBy: 1, // incremented by 1
});

var Item =  mongoose.model("Item", itemSchema);

// ====== ORDER MODEL ======
var orderSchema = new mongoose.Schema({
	cust_id: String,
	order_name: String,
	order_cost: Number,
	order_quantity: Number,
	order_total: Number,
	date: {type:Date, default: Date.now},
	day_total: Number
});

var Order = mongoose.model("Order", orderSchema);




//=========  ROUTES  ==============
app.get("/", function(req, res){
	//console.log(req.user.username);
	res.render("front");
});
app.get("/login", function(req,res){
	res.render("login");
});

app.post("/login" , passport.authenticate("local",
	{
		successRedirect:"/check",
		failureRedirect:"/login"
	}), function(req, res ){

});

app.get("/check" , function(req, res){
	if (req.user.username === "Admin"){
		res.redirect("/index");
	}
	else
	{
		res.redirect("/order");
	}
});

// MAIN MENU
app.get("/index", isLoggedIn, function(req, res){
	Item.find({}, function(err, items){
		if(err){
			console.log("error" +err);
		} else{
			res.render("index", {item:items});
		}
	});
});

// ADD NEW ITEM
app.get("/add",isLoggedIn, function(req, res){
	res.render("add");
});
// POST DATA FROM ADD TO INDEX PAGE
app.post("/index",isLoggedIn, function(req, res){
	Item.create(req.body.item, function(err, newItem){
		if (err){
			res.render("add");
		} else{
			req.flash('notify', 'Added successfully!')
			res.redirect("/index");
		}
	});
});
// MANAGE ITEM (SHOW)
app.get("/index/:id",isLoggedIn, function(req, res){
	Item.findById(req.params.id, function(err, foundItem){
		if(err){
			res.redirect("/index");
		} else{
			res.render("manage", {item:foundItem});
		}
	});
});

// EDIT ITEM 
app.get("/index/:id/update",isLoggedIn, function(req, res){
	Item.findById(req.params.id, function(err, editItem){
		if(err){
			res.redirect("/index");
		} else{
			res.render("update", {item:editItem});
		}
	});
});

// UPDATE ITEM
app.put("/index/:id",isLoggedIn, function(req, res){
	Item.findByIdAndUpdate(req.params.id, req.body.item, function(err, updateItem){
		if (err){
			res.redirect("/update");
		} else{
			res.redirect("/index");
		}
	});
});

// DELETE ITEM
app.delete("/index/:id",isLoggedIn, function(req, res){
	Item.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/manage");
		} else{
			res.redirect("/index");
			console.log("Item Deleted");
		}
	});
});

// HISTORY PAGE OF TOTAL ORDERS
app.get("/data",isLoggedIn, function(req, res){
	Order.find({}, function(err, order){
		if (err){
			console.log(err);
		} else{
			res.render("data", {order:order});
		}
	}).sort({date:'-1'});
});

// PRESENT DAY ORDER HISTORY
//orders will be accepted here as soon as customer confirms an order
app.get("/accept",isLoggedIn, function(req, res){
	Order.find({ "date": 
    					{$gte:   new Date(new Date().setHours(00,00,00)) ,     
        				 $lt :  new Date(new Date().setHours(23,59,59))
        				} 
        		},  function(err, order){
		if (err){
			console.log(err);
		}
		else{
			res.render("accept", {order:order});
		}
	}).sort({date:"-1"});
});


//CUSTOMERS PAGE
// PLACE ORDER FOR MENU
app.get("/order",isLoggedIn, function(req, res){
	Item.find({}, function(err, items){
		if(err){
			console.log("error" +err);
		} else{
			res.render("order", {item:items});
		}
	});
});
// SHOW ITEM FOR ORDER TO CONFIRM
app.get("/order/:id",isLoggedIn, function(req, res){
	Item.findById(req.params.id, function(err, foundItem){
		if(err){
			res.redirect("/order");
		} else{
			res.render("cart", {item:foundItem});
		}
	});
});

app.post("/order/:id",isLoggedIn, function(req, res){
	Item.findById(req.params.id, function(err, foundItem){
		var cust_id = req.user.username;
		var order_name = foundItem.item_name;
		var order_cost = foundItem.item_cost;
		var order_quantity = req.body.qty;
		var order_total = order_cost * order_quantity;

		var newOrder = { cust_id:cust_id, order_name:order_name, order_cost:order_cost,order_quantity:order_quantity, order_total:order_total,  order_total:order_total};
		Order.create(newOrder, function(err, newlyAddedOrder){
			if (err){
				console.log(err);
			}
			else
			{
				res.render("confirm", {order:newlyAddedOrder});

			}
		});
	});
});

// HISTORY OF THAT USER
app.get("/history",isLoggedIn, function(req, res){
	var customer = req.user.username;
	Order.find({cust_id:req.user.username}, function(err, order){
		if(err){
			res.redirect("/order");
		} else{
			res.render("history", {order:order, customer:customer});
		}
	}).sort({date:'-1'});
});

//=========== AUTH ROUTES  ================
app.get("/register", function(req,res){
	res.render("register");
});
//handle sign up logic
app.post("/register", function(req, res){
	var newUser = new User({username: req.body.username});
	console.log(newUser);
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			console.log("error: "+err);
			return res.render("register");
		}
		passport.authenticate("local")(req, res, function(){
			res.redirect("/");
		});
	});
});

// LOGOUT 
app.get("/logout", function(req,res){
	req.logout();
	res.redirect("/front");
});

//MIDDLEWARE
function isLoggedIn(req,res, next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect("/front");
}

// ERROR HANDLER
app.get("*" , function(req, res){
	res.redirect("/");
});


// SERVER
app.listen(3000, function(err){
	if (err){
		console.log(err);
	} else{
		console.log("Server has started on port 3000...");
	}
});