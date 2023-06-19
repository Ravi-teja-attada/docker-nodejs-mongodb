//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const GitHubStrategy = require("passport-github2").Strategy;

const app =express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: "Thisismyupdatedsecret.",
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.set('strictQuery', false);
mongoose.connect("mongodb://0.0.0.0:27017/usersDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    githubId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// used to serialize the user for the session


passport.use(new GoogleStrategy({
    clientID: "879286503426-26n214ruoc3e1sqqj9gf1ga8na28equn.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new GitHubStrategy({
    clientID: "97df7d4a5fb33c1a9c40",
    clientSecret: "a8525768cc562e8349efd10b65dee3e8e9633c40",
    callbackURL: "http://localhost:3000/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
    done(null, user.id); 
   // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


app.get("/", function(req, res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  }); 
  
app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({secret: {$ne: null}}, function (err, results) {
        if(err){
            console.log(err);
        }else{
            if(results){
                res.render("secrets", {userWithSecrets: results});
            }
        }
    });
});

app.get("/logout", function(req, res){
    req.logout(function(err) {
        if (err) { 
            return next(err);
         }});
    res.redirect("/");
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/login");
            });
        }
    });
    
});


app.get("/login", function(req, res){
    res.render("login");
});

app.post("/login", function(req, res){
    const user = new User ({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
        
    
});




app.get("/submit", function(req, res){
    if (req.isAuthenticated()) {
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    User.findById(req.user._id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = req.body.secret;
                foundUser.save();
                res.redirect("/secrets");
            }
        }
    });
});


app.listen(3000, function(){
    console.log("Server running on port 3000");
});