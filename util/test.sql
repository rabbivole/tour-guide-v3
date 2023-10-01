SELECT c.content_id, c.title, c.author, c.source_url, Media.media_name, Comments.ordering, Comments.comment, Tags.tag
FROM
  (
    SELECT *
    FROM Content
    WHERE content_id <= 2 -- largest id number
    LIMIT 10
  ) AS c
  LEFT JOIN Media on Media.content_id = c.content_id
  LEFT JOIN Tags on Tags.content_id = c.content_id
  LEFT JOIN Comments on Comments.content_id = c.content_id;

SELECT *
FROM Content
WHERE content_id <= 2 -- largest id number
ORDER BY content_id DESC
LIMIT 10;

SELECT *
FROM Media
WHERE content_id <= 2 -- largest id number
LIMIT 10;

SELECT content_id, tag_text
FROM (
  SELECT *
  FROM ContentTags
  WHERE content_id <= 2
  LIMIT 10
) AS tagids, Tags t
WHERE tagids.tag_id = t.tag_id;

SELECT *
FROM Comments
WHERE content_id <= 2
ORDER BY content_id, ordering
LIMIT 10;
