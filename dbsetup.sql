CREATE TABLE
IF NOT EXISTS Content
(
  content_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  author TEXT,
  source_url TEXT,
  flashing BOOLEAN,
  date_posted DATETIME
);

CREATE TABLE
IF NOT EXISTS Tags
(
  content_id INTEGER,
  tag TEXT,
  FOREIGN KEY
(content_id) REFERENCES Content
(content_id),
PRIMARY KEY
(content_id, tag)
);

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
IF NOT EXISTS Comments
(
  content_id INTEGER,
  comment TEXT,
  FOREIGN KEY
(content_id) REFERENCES Content
(content_id),
PRIMARY KEY
(content_id, comment)
);

CREATE TABLE
IF NOT EXISTS Users
-- though realistically, there's only one
(
  username TEXT PRIMARY KEY,
  pass BINARY
(60),
  auth_cookie TEXT
);