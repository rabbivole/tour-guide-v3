/**
  Code for initializing the database and putting some placeholder data in it.

  My autoformat settings do something terrible to .sql files and I'm not sure how to fix it.
*/

CREATE TABLE
IF NOT EXISTS Content
(
  content_id INTEGER PRIMARY KEY,
  title TEXT,
  author TEXT,
  source_url TEXT,
  flashing BOOLEAN,
  date_posted DATETIME
);

CREATE TABLE
IF NOT EXISTS Tags
(
  tag_id INTEGER PRIMARY KEY,
  tag_text TEXT
);

CREATE TABLE
IF NOT EXISTS
ContentTags
(
  content_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY
(content_id, tag_id),
  FOREIGN KEY
(content_id) REFERENCES Content
(content_id),
  FOREIGN KEY
(tag_id) REFERENCES Tags
(tag_id)
);

CREATE TABLE
IF NOT EXISTS Comments
(
  content_id INTEGER,
  ordering INTEGER,
  comment TEXT,
  FOREIGN KEY
(content_id) REFERENCES Content
(content_id),
PRIMARY KEY
(content_id, comment)
);

-- we're skipping having media ids because for our purposes, each media piece belongs to exactly one
-- post
CREATE TABLE
IF NOT EXISTS Media
(
  content_id INTEGER,
  media_name TEXT,
  FOREIGN KEY
(content_id) REFERENCES Content
(content_id),
PRIMARY KEY
(content_id, media_name)
);


CREATE TABLE
IF NOT EXISTS Users
-- though realistically, there's only one
(
  username TEXT PRIMARY KEY,
  pass BINARY
(60),
  auth_cookie TEXT,
  _locked BOOLEAN
);

-- placeholder data begins here!
INSERT INTO Content
  (title, author, source_url, flashing, date_posted)
VALUES
  (
    "gm_butts.bsp",
    "some guy",
    "http://steamcommunity.com/some/steamworkshop/link",
    TRUE,
    DATETIME("now")
);

INSERT INTO Media
  (content_id, media_name)
VALUES
  (1, "dummy1.jpg"),
  (1, "dummy2.jpg"),
  (1, "dummy3.jpg"),
  (1, "dummy4.jpg"),
  (1, "dummy5.jpg");


INSERT INTO Tags
  (tag_text)
VALUES
  ("these are"),
  ("some tags");

INSERT INTO ContentTags
  (content_id, tag_id)
VALUES
  (1, 1),
  (1, 2);

INSERT INTO Comments
  (content_id, ordering, comment)
VALUES
  (1, 1, "this is some placeholder content to help with figuring out a sql workflow"),
  (1, 2, "(it might also be useful for testing styling, once we get that far...)"),
  (1, 3, "this has been a test of the emergency automated posting system. please stay in your homes. everything is fine");

-- a second post, so we can test pagination
INSERT INTO Content
  (title, author, source_url, flashing, date_posted)
VALUES
  (
    "gallows.bsp",
    "a mystery",
    "http://steamcommunity.com/some/steamworkshop/link",
    FALSE,
    DATETIME("now")
);

INSERT INTO Media
  (content_id, media_name)
VALUES
  (2, "video.mp4");

INSERT INTO Comments
  (content_id, ordering, comment)
VALUES
  (2, 1, "some more placeholder content");