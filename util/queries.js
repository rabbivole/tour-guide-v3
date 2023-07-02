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
  INSERT_COOKIE: "UPDATE Users SET auth_cookie = ? WHERE username = ?"
}