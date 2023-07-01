module.exports = {
  QUERY_MAX_ID: "SELECT MAX(content_id) FROM Content",
  QUERY_CONTENT_BASE: "SELECT * FROM Content WHERE content_id < ? " +
    "ORDER BY content_id DESC " +
    "LIMIT ?",
  QUERY_MEDIA_RANGE: "SELECT * FROM Media WHERE content_id BETWEEN ? AND ? " +
    "ORDER BY content_id DESC, media_name ASC",
  QUERY_TAGS_RANGE: "SELECT content_id, tag_text FROM (" +
    "SELECT * FROM ContentTags WHERE content_id BETWEEN ? AND ? ) AS tagids, Tags t " +
    "WHERE tagids.tag_id = t.tag_id " +
    "ORDER BY content_id DESC",
  QUERY_COMMENTS_RANGE: "SELECT * FROM Comments WHERE content_id BETWEEN ? AND ? " +
    "ORDER BY content_id DESC, ordering",

  toSingle: function (baseRangeQuery) {
    return baseRangeQuery.replaceAll("<", "=");
  }
}