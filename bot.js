"use strict";
const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const cookieParser = require("cookie-parser");
const fs = require("fs");

// put media here initially until we verify the request
const TEMP_BUFFER = "media-buffer";
const IMG_DIR = "public/media";
// multer file upload bucket
// not confident about 'cb'. it seems like they're callback functions multer provides
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_BUFFER);
  },
  filename: async (req, file, cb) => { // this function determines a name for each file
    cb(null, await computeFilename(file.originalname, 0));
  }
})
const upload = multer({ storage: storage });

const tumblrHandler = require("./util/tumblr-handler.js");
// canned sql
const q = require("./util/queries.js");
// we have a class defined to make handling content objects a little easier
const Content = require("./util/content.js");

// timer - if this is non-null, we're going to try to post when the time comes around again
let postTimer = null;

// the platforms we should post to. most likely, this will be "tumblr" and possibly "cohost"
const POST_TO = ["tumblr"];
const DEFAULT_LIMIT = 20;
const LOGFILE = "tourguide.log";
const CONFIG = "config.json";
// if true, don't actually post anywhere
const DEBUG = true;

// enums for possible user errors:
const ERR_AUTH = -1;
// catchall 400. in add-post, this is 'you didn't attach a body'
const ERR_PARAM = -2;
// add-post error: if a post has no mapinfo, it must contain comments.
const ERR_MINIMAL_CONTENT = -3;
// add-post error: if one piece of mapInfo exists, all 3 of the fields + media must exist.
const ERR_INCOMPLETE_MAPINFO = -4;

const COOKIE_EXPIRY = 1000 * 60 * 60 * 8; // 8 hours, in ms
const DEFAULT_PORT = 7999;

const app = express();
// for application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data
//app.use(multer().none()); // requires the "multer" module
app.use(cookieParser());

// note - does not currently support searching, because that's going to be complicated
app.get("/posts", async (req, res) => {
  let db;
  try {
    db = await getDBConnection();
    let result = {
      next: null
    };

    if (postsParamsValid(req.query.id, req.query.before_id, req.query.limit)) {
      // was an id specified? if so, go get a single post
      if (req.query.id) {
        result.results = await getSinglePost(db, req.query.id)
      } else { // otherwise, get a range
        let limit = req.query.limit ? req.query.limit : DEFAULT_LIMIT;
        const maxBeforeId = (await getLastPostId(db)) + 1;
        let beforeId;
        // if no beforeId, use reasonable value
        // if someone calls us with a huge beforeId, adjust it
        if (!req.before_id || req.before_id > maxBeforeId) {
          beforeId = maxBeforeId;
        } else {
          beforeId = req.before_id;
        }
        const resultPosts = await getPostRange(db, beforeId, limit);

        result.results = resultPosts;
        result.next = buildNextPaginatedCall(limit, beforeId);
      }

      await close(db);
      res.json(result);
    } else { // bad params
      await close(db);
      res.type("text").status(400).send("Bad /posts request. Optional param 'id' must be >= 1. " +
        "Optional param 'before_id' must be >= 1 (but you probably want 2). Optional param 'limit' " +
        "must be >= 1.");
    }
  } catch (err) {
    await close(db);
    console.error(err);
    res.type("text").status(500).send("A server error has occurred. Please try again later.");
    logError("Error attempting to get posts. /posts query params, err: ",
      [req.query.id, req.query.before_id, req.query.limit, err]);
  }
});

app.post("/auth", upload.none(), async (req, res) => {
  let db;
  if (req.body.user && req.body.pass) {
    try {
      db = await getDBConnection();
      const valid = await authUser(db, req.body.user, req.body.pass);
      await close(db);

      if (valid) {
        const expiry = new Date(Date.now() + COOKIE_EXPIRY);
        console.log(expiry);
        res.cookie("cookie", valid, { expires: expiry });
        res.type("text").send("Authentication successful for user " + req.body.user + ".");
      } else {
        res.type("text").status(401).send("Provided credentials do not match an existing account.");
      }
    } catch (err) {
      await close(db);
      res.type("text").status(500)
        .send("A server error has occurred. Please try your request again later.");
      logError("Error attempting auth. /auth body params, valid, err: ",
        [req.body.user, req.body.pass, valid, err]);
    }
  } else {
    res.type("text").status(400).send("Missing required parameters 'user' and/or 'pass'.");
  }
});

app.post("/status", upload.none(), async (req, res) => {
  let db;
  try {
    db = await getDBConnection();
    const isValid = await statusParamsValid(db, req.body.action, req.cookies);
    await close(db);

    if (isValid === ERR_AUTH) { // bad/missing cookie
      res.type("text").status(401).send("This request requires a valid authentication cookie.");
    } else if (isValid === ERR_PARAM) { // bad params
      res.type("text").status(400)
        .send("Missing required param 'action' with required value 'stop' or 'go'.");

    } else { // good to go
      const result = await handleStatusChange(req.body.action);
      res.type("text").send(result);
    }
  } catch (err) { // db exploded
    console.error(err);
    await logError("Database error occurred in /status. Body params, err: ",
      [req.body.action, req.cookies, err]);
    res.type("text").status(500)
      .send("A server error has occurred. Please try your request again later.");
  }
})

app.post("/schedule", upload.none(), async (req, res) => {
  let db;
  try {
    db = await getDBConnection();
    const isValid = await scheduleParamsValid(db, req.body.time, req.cookies);
    await close(db);

    if (isValid === ERR_AUTH) { // bad/missing cookie
      res.type("text").status(401).send("This request requires a valid authentication cookie.");
    } else if (isValid === ERR_PARAM) { // bad param
      res.type("text").status(400)
        .send("Missing required param 'time', or 'time' was not parseable as a valid HH:MM UTC time.");

    } else { // good to go
      const result = await handleTimeChange(req.body.time);
      res.type("text").send(result);
    }
  } catch (err) { // db exploded
    console.error(err);
    await logError("Database error occurred in /schedule. Body params, err: ",
      [req.body.time, req.cookies, err]);
    res.type("text").status(500)
      .send("A server error has occurred. Please try your request again later.");
  }
});

app.post("/add-post", authCheck, upload.array('media'), async (req, res) => {
  let db;
  try {
    db = await getDBConnection();
    const isValid = await addParamsValid(db, req.body, req.files);
    await close(db);

    if (isValid === ERR_PARAM) { // no body
      res.type("text").status(400)
        .send("Missing body for /add-post.");
    } else if (isValid === ERR_INCOMPLETE_MAPINFO) {
      res.type("text").status(400)
        .send("Missing some parts of required map information. If title/author/url are present, " +
          "all three of them must be, as well as media.");
    } else if (isValid === ERR_MINIMAL_CONTENT) {
      res.type("text").status(400)
        .send("Missing minimally required content for a post. A post must either include some " +
          "comments or have info about a map + some media for it.");
    } else { // good to go
      // move images from temp folder to media
      await moveFiles(req.files);
      const responseObject = buildResponse(req.body, req.files);
      console.log("sent response: ");
      console.log(responseObject);
      res.json(responseObject);
    }
    await cleanUpTemp();
  } catch (err) { // some kind of error- could be DB, could be file system related
    console.error(err);
    await logError("Error occurred in /add-post. Body params, err: ",
      [req.body, req.files, req.cookies, err]);
    res.type("text").status(500)
      .send("A server error has occurred. Please try your request again later.");
  }
});

function buildResponse(body, files) {
  const response = {
    status: "successful"
  };

  const flashing = body.flashing && body.flashing === "on" ? true : false;

  // pile in all the media
  let media = [];
  for (const file of files) {
    media.push(file.filename);
  }

  // tags will be comma-separated
  let tags = body.tags ? body.tags.split(",") : [];

  // comment processing is a little hairier. there's almost certainly a more elegant method here
  const regex = new RegExp("\\n");
  let comments = [];
  if (body.comments) {
    comments = body.comments
      .split(regex)
      .map(line => line.trim())
      .filter(line => line !== ""); // remove stray "" elements left by double linebreaks
  }

  response.content = new Content(
    {
      title: body.title,
      author: body.author,
      url: body["source-url"]
    },
    media,
    flashing,
    tags,
    comments
  );

  return response;
}

async function computeFilename(oldName, suffix) {
  // the nature of try-catch means we're doing this recursively in place of what would be a while
  let filename;
  // if we're looking for a suffixed file, append it
  if (suffix != 0) {
    filename = oldName.substring(0, oldName.indexOf(".")) + "(" + suffix + ")" +
      oldName.substring(oldName.indexOf("."));
  } else {
    filename = oldName;
  }
  try {
    // does it exist?
    await fs.statSync(IMG_DIR + "/" + filename);
  } catch (err) {
    if (err.code === "ENOENT") {
      // the current filename doesn't exist! so we can safely return it
      return filename;
    } else { // something else terrible happened
      console.error(err);
      logError("Error trying to check if file exists. Filename, err: ",
        [oldName, err]);
      return null;
    }
  }
  // if we're here, that name is taken. increment the suffix and try again:
  const newSuffix = parseInt(suffix) + 1;
  return computeFilename(oldName, newSuffix);
}

/**
 * If any files are hanging around in the media buffer, delete them.
 */
async function cleanUpTemp() {
  try {
    const dir = await fs.readdirSync(TEMP_BUFFER);
    for (const file of dir) {
      await fs.unlinkSync(TEMP_BUFFER + "/" + file);
    }
  } catch (err) {
    console.error(err);
    logError("Error while trying to clean up temp directory. Error: ", [err]);
  }
}

async function moveFiles(files) {
  for (const file of files) {
    const oldPath = file.destination + "/" + file.filename;
    const newPath = IMG_DIR + "/" + file.filename;
    await fs.renameSync(oldPath, newPath);
  }
}

/**
 * Middleware function to sit before Multer and make sure the /add-post caller is authenticated.
 *
 * If we *don't* do this, Multer's upload
 * handling will dump the files into the storage even if we later find out the caller wasn't
 * authorized. This would be bad!
 * @param {Request} req express HTTP request object
 * @param {Response} res express HTTP response object
 * @param {NextFunction} next express middleware iterator function thing
 */
async function authCheck(req, res, next) {
  let db;
  try {
    db = await getDBConnection();
    if (!req.cookies || !(await isLoggedIn(db, req.cookies.cookie))) {
      await close(db);
      res.type("text").status(401).send("This request requires a valid authentication cookie.");
    } else {
      await close(db);
      // pass along to next middleware
      next();
    }
  } catch (err) {
    console.error(err);
    logError("Error while trying to run authentication middleware. Cookie, err: ",
      [cookies, err]);
  }
}

async function addParamsValid(db, meta, media) {
  // todo: may want more detailed error feedback
  if (!meta) { // body must exist
    console.log("meta was null");
    return ERR_PARAM;
  } else if ( // if mapinfo exists, all 3 fields and media must exist
    (meta.title && (!meta.author || !meta["source-url"] || !media)) ||
    (meta.author && (!meta.title || !meta["source-url"] || !media)) ||
    (meta["source-url"] && (!meta.title || !meta.author || !media))) {
    console.log(meta.title, meta.author, meta["source-url"], media);
    return ERR_INCOMPLETE_MAPINFO;
  } else if (!meta.title && !meta.comments) { // if mapinfo doesn't exist, comments must exist
    console.log(meta.title, meta.comments);
    return ERR_MINIMAL_CONTENT;
  }

  // not doing any detailed media verification rn
  return 0;
}

async function handleTimeChange(time) {
  // change the time in the config
  const cfg = await getConfig();
  cfg.post_time = time;
  await setConfig(cfg);

  // if the bot is running, reschedule posting
  if (cfg.active) {
    schedulePost(time);
  }

  return "Post time scheduled for " + time + ".";

}

async function scheduleParamsValid(db, time, cookies) {
  if (!cookies || !(await isLoggedIn(db, cookies.cookie))) {
    return ERR_AUTH;
  } else if (!time || !parseTime(time).hour) {
    return ERR_PARAM;
  }

  return 0;
}

function parseTime(time) {
  const hour = time.substring(0, time.indexOf(":"));
  const mins = time.substring(time.indexOf(":") + 1);

  if (time.indexOf(":") === -1 || // no :
    hour === "" || mins === "" || // malformed somehow
    Number.isNaN(hour) || Number.isNaN(mins) || // non-numeric
    hour < 0 || hour > 24 || mins < 0 || mins > 59 // bounds checking
  ) {
    return { hour: null, mins: null };
  }

  return { hour, mins };
}

/**
 * Does `action`, either pausing or unpausing the bot. If `action` requests the existing status,
 * this is a no-op.
 * @param {string} action req.body.action; should be validated as either 'go' or 'stop' first
 * @returns {string} the text that should be sent as an API response confirming what changed
 */
async function handleStatusChange(action) {
  // convert to boolean for simpler comparison
  const active = (action === "go");

  // config file has current status and post time
  const config = await getConfig();

  let response;
  if (active) {
    response = "Unpause command successful; the bot is now unpaused. We'll try to post at " +
      config.post_time + "."
  } else {
    response = "Pause command successful; the bot is now paused.";
  }
  // wish i had logical XOR
  if (active && !config.active) { // unpause
    postTimer = schedulePost(config.post_time);
  } else if (!active && config.active) { // pause
    postTimer = null;
  } // else, no-op

  // update config file
  config.active = active;
  await setConfig(config);

  return response;
}

function schedulePost(postTime) {
  /* okay, so... we need the # of ms between now and the next instance of our posting time. to get
  that, we do some kind of icky Date math. we ignore DST; this method should be used to
  schedule the next post each day, so only two days out of the year should be incorrect (i hope!)
  and i consider that a tolerable loss. */
  let { hour, mins } = parseTime(postTime);
  const currentTime = new Date(Date.now());

  // start constructing a Date object for when our post should take place
  const scheduledTime = new Date(Date.now());

  // is the next instance of postTime tomorrow?
  if (currentTime.getHours() > hour ||
    (currentTime.getHours() == hour && currentTime.getMinutes() > mins)) {
    // move it forward a day
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // set desired hours/minutes, now that our date is correct
  scheduledTime.setHours(hour);
  scheduledTime.setMinutes(mins);

  // then just subtract one from the other
  const ms = scheduledTime - currentTime;
  console.log(ms);
  postTimer = setTimeout(makePost, ms);
}

async function getConfig() {
  return JSON.parse(await fs.readFileSync(CONFIG));
}

async function setConfig(newConfig) {
  await fs.writeFileSync(CONFIG, JSON.stringify(newConfig, null, 2));
}

async function statusParamsValid(db, action, cookies) {
  if (!cookies || !(await isLoggedIn(db, cookies.cookie))) {
    return ERR_AUTH;
  } else if (!action || (action !== "go" && action !== "stop")) {
    return ERR_PARAM;
  } else {
    return 0;
  }
}

async function isLoggedIn(db, cookie) {
  const result = await db.get(q.QUERY_IS_AUTHED, [cookie]);
  console.log(result);
  return result.cnt === 1;
}

async function authUser(db, user, pass) {
  const userDetails = await db.get(q.QUERY_GET_USER, [user])
  if (userDetails && await bcrypt.compare(pass, userDetails.pass)) {
    // make them a cookie and store it
    const cookie = uuid.v4();
    await db.run(q.INSERT_COOKIE, [cookie, user]);
    return cookie;
  }
}

/**
 * Checks the request parameters for validity. For a parameter to be valid, it should either be
 * null/undefined (/posts params are all optional) or a reasonable value.
 *
 * @param {int} cid content_id
 * @param {int} beforeId before_id
 * @param {int} limit limit
 * @returns {boolean} true if each parameter is either omitted or valid, false if not
 */
function postsParamsValid(cid, beforeId, limit) {
  return (!cid || cid >= 1) && (!beforeId || beforeId >= 1) && (!limit || limit >= 1);
}

async function getPostRange(db, beforeId, limit) {
  // first get basic info to build skeleton objects with
  const fromContent = await db.all(q.QUERY_CONTENT_BASE, [beforeId, limit]);
  // do empty check here
  let out = unpackContent(fromContent);

  // convert beforeId and limit to a [min, max] id range
  const range = [beforeId - limit, beforeId - 1];

  // fill out skeletons with any additional info there is
  const fromMedia = await db.all(q.QUERY_MEDIA_RANGE, [range[0], range[1]]);
  console.log(range);
  out = unpackExtra(fromMedia, out, "media", "media_name");

  const fromTags = await db.all(q.QUERY_TAGS_RANGE, [range[0], range[1]]);
  out = unpackExtra(fromTags, out, "tags", "tag_text");

  const fromComments = await db.all(q.QUERY_COMMENTS_RANGE, [range[0], range[1]]);
  out = unpackExtra(fromComments, out, "comments", "comment");

  return out;
}

async function getSinglePost(db, cid) {
  // first go get the basic info to build skeleton objects with
  const fromContent = await db.get(q.QUERY_CONTENT_SINGLE, [cid]);
  if (!fromContent) { // not found todo edit api doc, no more 404
    return [];
  }
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
  // our query results are sorted into same order as our working object, so it's safe to iterate
  // like this
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
  return (await db.get(q.QUERY_MAX_ID)).before_id;
}

async function makePost() {
  const debugPost = new Content(
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

  if (DEBUG) {
    console.log("debug: we called makePost! at ");
    console.log(new Date(Date.now()));
  } else {
    for (const platform of POST_TO) {
      if (platform === "tumblr") {
        tumblrHandler.postToTumblr(post);
      }
      if (platform === "cohost") {
        // insert a cohost handler here
      }
    }

    // put this post in the archive db

    // move the media

    // schedule the next post
    const cfg = await getConfig();
    schedulePost(cfg.post_time);
  }
}

async function logError(text, args) {
  let out = timestamp();
  out += text + "\r\n";
  for (const arg of args) {
    // to hopefully print something more useful than 'Object object'
    out += JSON.stringify(arg);
    out += "\r\n";
  }

  await fs.writeFileSync(LOGFILE, out, { flag: "a+" });
}

/**
 * For logging purposes. Get a minimal datetime string, formatted such that it could be prepended to
 * a log line.
 * @returns {string} a string like "[m/d/yy hh:mi] "
 */
function timestamp() {
  const now = new Date(Date.now());
  let timeString = now.toLocaleString("en-US",
    { dateStyle: "short", timeStyle: "short", hourCycle: "h24" });
  timeString = timeString.replace(",", "");
  let out = "[" + timeString + "] ";
  return out;
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

async function onBoot() {
  const config = await getConfig();
  schedulePost(config.post_time);

}

onBoot();
app.use(express.static("public"));
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);
