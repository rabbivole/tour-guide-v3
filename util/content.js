"use strict";

// i don't understand js class syntax super well so i'm partly going off some
// examples from the `stills` library here

/**
 * A passive data object describing, most generally, a 'unit of content' for
 * Roadtrip.
 *
 * In most cases, this is the metadata, media names, comments, etc for one map.
 * This object is what's stored in the 'queue' file we poll when it's time to
 * post a new map, and it should generally match the schema stored in the
 * archive database. (In theory, this can be also support text-only blog
 * posts. A Content object should contain *at least one* of:
 * mapInfo+media OR comments.)
 *
 * The content for a given map can (and likely, *must*) be broken into smaller
 * pieces at the time of posting to comply with standards for a particular
 * platform. For example, a top-level Content object for the map gm_butts.bsp
 * might have
 * 13 images listed, but a handler for Tumblr should break this into multiple
 * Content objects and posts with the same map info/tagging to stay under the 10
 * image-per-post
 * limit. The Tumblr would then have two separate posts about gm_butts.bsp to
 * cover this one Content object from the queue.
 */
class Content {
  /**
   *
   * @param {object} mapInfo an object with
   * title/author/sourceURL info for this map, all strings
   * @param {string[]} media an array of pathnames to media files (jpg, mp4)
   * @param {boolean} flashing true if the media for this map contains flashing
   * and the post[s] should contain some kind of warning
   * @param {string[]} tags an array of string tags (not all platforms can use
   * this)
   * @param {string} comments any additional comments; end a paragraph with '\n'
   * (handling this is gonna be really really fun I bet)
   */
  constructor(
    mapInfo = { title: null, author: null, url: null },
    media = [],
    flashing = false,
    tags = [],
    comments = null
  ) {
    this.mapInfo = mapInfo;
    this.media = media;
    this.flashing = flashing;
    this.tags = tags;
    this.comments = comments;
  }

  clone() {
    return new Content(this.mapInfo, this.media, this.flashing, this.tags,
      this.comments);
  }
}

module.exports = Content;