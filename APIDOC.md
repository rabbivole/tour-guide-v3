# tourguide internal API documentation

tourguide is a system for posting and archiving screenshots of custom video game levels, intended for use with the x86_ROADTRIP blog. I designed this for myself to use and so most of the endpoints require admin authentication and are highly specified for my own purposes. This document largely exists as an implementation reference for myself.

***

## <span style="color:green">**GET**</span> Get content, optionally matching some filtering criteria

- `/posts`
- `/posts?id={num}`
- `/posts?query={querytext}`
- `/posts?limit={num}`
- `/posts?before_id={num}`

Get content posts from the archive. `query` will search all text fields. Posts will be returned in descending content id order, which *should, but might not correspond to chronological posting order*. Regardless, the aim is to try to serve recent posts first. (If this were critical, we'd implement this by paginating/ordering on the date_posted - I'm not super concerned with this, so I'm implementing a simpler option.)

By default, a response to `/posts` will be limited to 20 posts. Pagination is recommended for reasonable response times.

The `query` param is currently not yet supported.

**Example Request:** `/posts?query=gm_butts`

**Example Response:** `[json]`
```json
{
  next: null,
  results: [
    {
      content_id: 5,
      contents: {
        map_info: {
          title: "gm_butts.bsp",
          author: "some guy; possibly a development company",
          source_url: "https://steamcommunity.com/some/steam/workshop/link"
        },
        date_posted: "2023-06-28 00:55:08",
        flashing: false,
        tags: ["these are", "some tags"],
        comments: [
          "not all posts have comments; this may be an empty list.",
          "each array element is considered as its own paragraph in contexts where paragraph breaks are applicable. if none are desired, this can be a one-element list.",
          "in theory, text-only posts (or at least, ones that aren't primarily for the purpose of featuring a map) can exist if content exists in comments, but map_info is omitted or its fields are null.",
        ],
        media: ["a_series_of.jpg", "filenames.mp4", "or_empty_list.jpg"]
      }
    }
  ]
}
```

**Error Handling:**
- A query that returns 0 results is not an error, merely an empty list.
- `id`, `limit`, and `before_id` are all optional parameters. If any of these is present but is <1, returns `400 [text]` with the constraints.

## <span style="color:blue">**POST**</span> Log in to access administrative endpoints

- `/auth`, body parameters `{user, pass}`

Log into an account. (Realistically, log into *the* account. There's only one, and it's mine.)

If successful, this endpoint responds with an authentication cookie that should be attached to any sensitive requests. This cookie expires after some time.

**Example Request:** `/auth`,
```json
{
  user: "coolguy",
  pass: "withacoolpassword"
}
```
**Example Response:** `[text]`
```
Authentication successful for user {user}.
```
...with a cookie attached

**Error Handling:**
- Bad login attempts receive `401 [text] Provided credentials do not match an existing account.`

***

The remaining endpoints are administrative and require a valid authentication cookie. Requests missing a valid cookie will get the response `401 [text] You are not authenticated to perform this action.`

## <span style="color:blue">**POST**</span> Set the posting time

- `/schedule`, body parameter `{time}`, see specification below

Changes the time of day the bot posts at. The bot is invariably intended to post one piece of content per day. However, note that setting this to something new will set the countdown to posting to the next occurrence of that new time, so changing the post time may result in the next post being sooner than once every 24 hours.

The time should be specified **in 24-hour UTC.** So if I wanted the bot to post at 8 AM in my local timezone, PST, I would send the request for `15:00`.

(I just realized dealing with daylight savings is going to be miserable. Well, that's a problem for future me.)

**Example Request:** `/schedule`,
```json
{
  time: "15:00"
}
```

**Example Response:** `[text]`
```
Post time set to 15:00 UTC.
```

**Error Handling:**
- If `time` is not parseable as a valid 24-hour time or a `time` body parameter is not present, returns `400 [text] Missing required param 'time', or 'time' was not parseable as a valid HH:MM UTC time.`
- If a `time` body parameter is not present, returns `400 [text] Missing required request parameter {time}, a 24-hour time string.`
- The API does not know that you have beefed it converting between timezones and cannot return this as an error.

## <span style="color:blue">**POST**</span> Pause or unpause queue

- `/status`, `{action}`

If `action = "stop"`, this pauses the bot, such that no further posts will be made. If `action = go", this unpauses the bot, and it will try to post again when the scheduled post time next occurs.

Note that if the queue is empty, the bot will simply check it at the scheduled post time, find it empty, and not post. Not pausing the bot is not a critical error, it just seems like a good feature to add.

**Example Request:** `/status`,
```json
{action: "stop"}
```

**Example Response:** `[text]`
```
Stop command successful; the bot is now paused.
```
*(or, for "go":)*
```
Unpause command successful; the bot is now unpaused. We'll try to post at {time}.
```

**Error Handling:**

- If the `action` parameter is missing or not recognized, returns `400 [text] Missing required parameter 'action'; valid options are "stop" and "go".`

## <span style="color:blue">**POST**</span> Add a piece of content to the queue

-`/add-post`, see below for detailed body specification

Adds a new post to the queue, where it will eventually be posted and become part of the archive. The submitted content object is returned in a successful response as confirmation.

In this context, one map/game/etc being featured == one piece of content == one post. When crossposted to other social media platforms, limitations will often require that one 'piece of content' in the queue be broken into multiple 'posts'. In our home archive and in the queue, though, the rule is one content entity per map.

(Unless something gets re-featured and I return to it a second time, or something. I don't think I've ever done that, but it's not impossible. Regardless, the rule is still that one item in the queue is one daily content blast.)

Files that you upload should be named the way you want them to exist in the archive. Note that internal structure dictates that files exist in the same directory together. If a conflict exists, the API will change the filenames for you. (This is actually pretty likely to come up. I generally retain the map name in image names, and I've lost count of how many maps called `gm_apartment(s).bsp` I've seen.)

**Example Request:** `/add-post`,
```json
{
  map_info: {
      title: "gm_butts.bsp",
      author: "some guy; possibly a development company",
      source_url: "https://steamcommunity.com/some/steam/workshop/link"
    },
  flashing: true,
  tags: ["these are", "some tags"],
  media: [Stream objects],
  comments: ["comments go here, etc"]
}
```

**Example Response:** `[json]`
```json
{
  status: "successful - Naming conflict detected! Media filenames have been edited.",
  content: {
    map_info: {
      title: "gm_butts.bsp",
      author: "some guy; possibly a development company",
      source_url: "https://steamcommunity.com/some/steam/workshop/link"
    },
    flashing: true,
    tags: ["these are", "some tags"],
    media: ["gm_butts2-1.jpg", "gm_butts2-2.jpg", "gm_butts2-3.jpg"],
    comments: ["comments go here, etc"]
  }
}
```
*(If no naming conflict exists, the `status` field will simply be "successful".)*

**Error Handling:**
- If something is wrong with the files, returns `400 [text] Error with file format.`
- If the submitted form doesn't include *at least one of* map_info+media or comments, returns `400 [text] A post must minimally contain either some map information and media for it, or some text comments.`

(tbd: this all assumes I can get file upload with multer working the way I think I can.)