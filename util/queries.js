module.exports = {
  QUERY_MAX_ID: "SELECT MAX(content_id) AS before_id FROM Content",
  QUERY_CONTENT_BASE: "SELECT * FROM Content WHERE content_id < ? " +
    "ORDER BY content_id DESC " +
    "LIMIT ?",
  QUERY_CONTENT_SINGLE: "SELECT * FROM Content WHERE content_id = ? ",
  QUERY_MEDIA_RANGE: "SELECT * FROM Media WHERE content_id BETWEEN ? AND ? " +
    "ORDER BY content_id DESC, media_name ASC",
  QUERY_TAGS_RANGE: "SELECT content_id, tag_text FROM (" +
    "SELECT * FROM ContentTags WHERE content_id BETWEEN ? AND ? ) AS tagids, Tags t " +
    "WHERE tagids.tag_id = t.tag_id " +
    "ORDER BY content_id DESC",
  QUERY_COMMENTS_RANGE: "SELECT * FROM Comments WHERE content_id BETWEEN ? AND ? " +
    "ORDER BY content_id DESC, ordering",

  QUERY_GET_USER: "SELECT * FROM Users WHERE username = ?",
  INSERT_COOKIE: "UPDATE Users SET auth_cookie = ? WHERE username = ?",
  // note this will cease to be a good plan if we ever have more than one user account
  QUERY_IS_AUTHED: "SELECT COUNT(username) AS cnt FROM Users WHERE auth_cookie = ?",

  INSERT_CONTENT: "INSERT INTO Content (title, author, source_url, flashing, date_posted) VALUES " +
    "(?, ?, ?, ?, DATETIME('now'))",
  INSERT_TAG: "INSERT OR IGNORE INTO Tags (tag_text) VALUES (?)",
  QUERY_ID_FROM_TAG: "SELECT tag_id FROM Tags WHERE tag_text = ?",
  INSERT_TAG_ON_CONTENT: "INSERT INTO ContentTags (content_id, tag_id) VALUES " +
    "(?, ?)",
  INSERT_COMMENTS: "INSERT INTO Comments (content_id, ordering, comment) VALUES " +
    "(?, ?, ?)",
  INSERT_MEDIA: "INSERT INTO Media (content_id, media_name) VALUES " +
    "(?, ?)"
}