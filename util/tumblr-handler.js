"use strict";

const tumblr = require('tumblr.js');
const FileReader = require('filereader');
const { createReadStream } = require('fs');

const KEYS = require('../credentials.json'); // see createClient below for field names
const TUMBLR_NAME = "x86-roadtrip"; // the blog to post to
// tumblr seems to want to limit images in a photo post to 10. there are ways around this, but we'll
// stick with it.
const TUMBLR_MAX_IMG = 10;

// we'll be using tumblrjs' functionality for adding a new method, because legacy multi-image posts
// are broken and it doesn't support NPF
const client = tumblr.createClient({
  credentials: {
    consumer_key: KEYS.tumblr.consumerKey,
    consumer_secret: KEYS.tumblr.consumerSecret,
    token: KEYS.tumblr.oauthToken,
    token_secret: KEYS.tumblr.oauthSecret
  },
  returnPromises: true
});

/**
 * Returns an array of Content objects for posting this map to Tumblr. Each
 * Content object in the array will be one Tumblr post.
 *
 * With Tumblr, we currently need to break the post up for 1+ of the following
 * conditions:
 * 1) there are more than 10 images
 * 2) there are images and also a video; images and video can't coexist
 * 3) there is more than one video; Tumblr only supports one video upload
 *
 * Some of these constraints may be more fluid in NPF, but it seems best to keep
 * it simple.
 *
 * If postObject meets all of these conditions, this function returns postObject
 * as a 1-element array.
 * @param {Content} content one map's content; see content.js for schema
 */
function formatForTumblr(content) {
  // make a copy of the media so we can mess it up without affecting the parent
  // object
  const media = [...content.media];

  // resulting content objects for posts will be returned in an array
  let totalPosts = [];

  // are there videos?  if so, pull them out into their own posts
  const videos = videosContained(media);
  for (const video of videos) {
    // swap out the media field
    const newPost = content.clone();
    newPost.media = [video];
    /* additionally, if there are comments, we don't want them on every post.
     * a potential solution is to put them on the last post. this
     * mimics how they were generally used on twitter and isn't great, but is
     * simple */
    if (content.comments) {
      newPost.comments = null; // we'll re-add them to whatever the last one is
    }
    totalPosts.push(newPost);
    // when we're done we want a clean list of only images
    media.splice(media.indexOf(video), 1);
  }

  // if images, parcel them out among posts according to TUMBLR_MAX_IMG
  if (media.length > 0) {
    const imagesForPosts = computeImagesPerPost(media);
    const imagePosts = imagesForPosts.map((imageList) => {
      const p = content.clone();
      p.media = imageList;
      p.comments = null;
      return p;
    });
    // add before any videos
    totalPosts = imagePosts.concat(totalPosts);
  }

  // if comments, add them back to the final post
  const lastPost = totalPosts[totalPosts.length - 1];
  lastPost.comments = content.comments;

  return totalPosts;
}

/**
 * Builds a list containing the image paths for each Tumblr post we're going to
 * make. If the existing list in `content` is fine, this function returns a
 * one-element array containing the existing list. Otherwise, this function
 * tries to divide the images roughly equally among as many lists as needed
 * to keep the images-per-post below TUMBLR_MAX_IMG.
 *
 * `media` should consist of only images, no videos. If you call this function
 * on a list that contains videos, you'll get lists with videos in them, which
 * may not be desirable.
 *
 * Don't call this function with an empty list.
 * @param {string[]} media one map's media; an array of file paths
 * @returns {[string[]]} an array of arrays, where each inner array is the
 * images that should be attached to each post
 */
function computeImagesPerPost(media) {
  let numImages = media.length;
  let numPosts = 1;
  // try dividing images among an increasing number of posts until the
  // image-per-post is below the limit
  while (numImages > TUMBLR_MAX_IMG) {
    numPosts++;
    numImages = Math.ceil(numImages / numPosts);
  }

  // if we didn't do any division, just return the existing media array
  if (numPosts === 1) {
    return [media]
  }
  // otherwise, build lists of the images for each post
  const mediaCopy = [...media];
  let out = [];
  for (let i = 0; i < numPosts; i++) {
    let thisPost = [];
    for (let j = 0; j < numImages; j++) {
      // load post with up to numImages pics from the overall list
      const nextElement = mediaCopy.shift();
      // don't add if we've run out. this is inelegant but works
      if (nextElement) {
        thisPost.push(nextElement);
      }
    }
    out.push(thisPost);
  }

  return out;
}

/**
 * Currently only checks for .mp4.
 * @param {string[]} media media file paths for one map
 * @returns {string[]} the files in the media array that are videos
 */
function videosContained(media) {
  let videos = [];
  for (const mediaPath of media) {
    if (mediaPath.endsWith(".mp4")) {
      videos.push(mediaPath);
    }
  }
  return videos;
}

module.exports = {
  postToTumblr: function (postObject) {
    console.log("testing. initial object: ");
    console.log(postObject);

    const output = formatForTumblr(postObject);
    console.log("formatted: ");
    console.log(output);
  }
}