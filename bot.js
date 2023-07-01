"use strict";
const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const cookieParser = require("cookie-parser");

const tumblrHandler = require("./util/tumblr-handler.js");
// canned sql
const q = require("./util/queries.js");
// we have a class defined to make handling content objects a little easier
const Content = require("./util/content.js");

// the platforms we should post to. most likely, this will be "tumblr" and possibly "cohost"
const POST_TO = ["tumblr"];
const DEFAULT_LIMIT = 20;

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

// note - does not currently support searching, because that's going to be complicated
app.get("/posts", async (req, res) => {
  let db;
  try {
    db = await getDBConnection();
    let result = {
      next: null
    };

    // was an id specified? if so, go get a single post
    if (req.query.id) {
      result.results = await getSinglePost(db, req.query.id)
    } else { // otherwise, get a range
      let limit = req.query.limit ? req.query.limit : DEFAULT_LIMIT;
      let beforeId = req.query.before_id ? req.query.before_id : (await getLastPostId(db)) + 1;
      const resultPosts = await getPostRange(db, limit, beforeId);

      result.results = resultPosts;
      result.next = buildNextPaginatedCall(limit, beforeId);
    }

    await close(db);
    res.json(result);
  } catch (err) {
    await close(db);
    console.error(err);
    res.type("text").status(500).send("A server error has occurred. Please try again later.");
    //logError();
  }
});

async function getSinglePost(db, cid) {
  let query = q.toSingle(q.QUERY_CONTENT_BASE);
  // first go get the basic info to build skeleton objects with
  const fromContent = await db.get(query, [cid, 1]);
  let out = unpackContent([fromContent]);

  // then fill out those skeletons with whatever additional info we have
  const fromMedia = await db.all(q.QUERY_MEDIA_RANGE, [cid, cid]);
  out = unpackExtra(fromMedia, out, "media", "media_name");

  const fromTags = await db.all(q.QUERY_TAGS_RANGE, [cid, cid]);
  out = unpackExtra(fromTags, out, "tags", "tag_text");

  const fromComments = await db.all(q.QUERY_COMMENTS_RANGE, [cid, cid]);
  out = unpackExtra(fromComments, out, "comments", "comment");

  return out;
}

function unpackExtra(queryResult, workingResponse, whichField, columnName) {
  // our query results are sorted, so it's safe to iterate like this
  let i = 0;
  let nextPost = workingResponse[i];
  for (const row of queryResult) {
    // if this file is attached to a different post, advance the post cursor
    while (row.content_id != nextPost.content_id) {
      i++;
      nextPost = workingResponse[i];
    }
    nextPost.content[whichField].push(row[columnName]);
  }

  return workingResponse;
}

function unpackContent(queryResult) {
  let out = [];
  for (const post of queryResult) {
    const mapInfo = {
      title: post.title,
      author: post.author,
      source_url: post.source_url
    };
    let flashing = post.flashing === 1 ? true : false;
    const nextEntry = {
      content_id: post.content_id,
      content: new Content(
        mapInfo,
        [],
        flashing,
        [],
        []
      )
    }

    // add some extra information beyond what Content covers
    nextEntry.content.date_posted = post.date_posted;
    out.push(nextEntry);
  }

  return out;
}

function buildNextPaginatedCall(limit, previousBeforeId) {
  const newBeforeId = previousBeforeId - limit;
  if (newBeforeId <= 1) {
    return null;
  } else {
    return "/posts?limit=" + limit + "&before_id=" + newBeforeId;
  }
}

async function getLastPostId(db) {
  return await db.get(q.QUERY_MAX_ID);
}

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

/**
 * Simple alias function. If db is non-null, closes it.
 *
 * Note that there's no way to check if db is actually 'open', and closing twice is a crash.
 * @param {sqlite3.Database} db the database object
 */
async function close(db) {
  if (db) {
    await db.close();
  }
}

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur should be caught in the function that calls this one.
 * @returns {sqlite3.Database} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "roadtrip_archive.db",
    driver: sqlite3.Database
  });

  return db;
}

app.use(express.static("public"));
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);
