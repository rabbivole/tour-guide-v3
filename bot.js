"use strict";
const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const cookieParser = require("cookie-parser");

const tumblrHandler = require("./util/tumblr-handler.js");
// we have a class defined to make handling content objects a little easier
const Content = require("./util/content.js");

// the platforms we should post to. most likely, this will be "tumblr" and possibly "cohost"
const POST_TO = ["tumblr"];


const COOKIE_EXPIRY = 1000 * 60 * 60 * 8; // 8 hours, in ms
const DEFAULT_PORT = 7999;
const app = express();
// [lecture code copypasta] for application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module
app.use(cookieParser());

function makePost() {
  // debug post for now:
  const post = new Content(
    {
      author: "dickman",
      title: "gm_butts.bsp",
      url: "www.google.com"
    },
    [
      __dirname + '/public/img-holding/skywatcher.mp4'
    ],
    true,
    ['these are', 'some tags'],
    ["video upload attempt again, because there's a phantom 'undefined' up top. wtf?"]);

  for (const platform of POST_TO) {
    if (platform === "tumblr") {
      tumblrHandler.postToTumblr(post);
    }
    if (platform === "cohost") {
      // insert a cohost handler here
    }
  }

  // do housekeeping - do the SQL queries to put this post in the archive, record the post date,
  // move the media, etc

  // schedule the next post
}


app.use(express.static("public"));
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);
