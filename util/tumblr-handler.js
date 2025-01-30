"use strict";

const tumblr = require('tumblr.js');
const FileReader = require('filereader');
const { createReadStream } = require('fs');
const fs = require('fs');
const blurbGen = require('./random-blurb.js');

const KEYS = require('../credentials.json'); // see createClient below for field names
const TUMBLR_NAME = "x86-roadtrip"; // the blog to post to
// tumblr seems to want to limit images in a photo post to 10. there are ways around this, but we'll
// stick with it.
const TUMBLR_MAX_IMG = 10;
// for marking things epilepsy-sensitive. advised to remove 'cw' for best practices
const FLASH_TAG = "flashing";

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
 * todo: figure out exactly how this is used
 * @param {string} apiPath the endpoint URL
 * @returns {object} parameters for the call
 */
function getBaseParams(apiPath) {
  return {
    ...client.requestOptions,
    url: client.baseUrl + apiPath,
    oauth: client.credentials
  };
}

/**
 * Workaround for posting videos. (Go straight through the tumblrjs client instead. We have less
 * control, but at least it functions.)
 * @param {Content} content a Content object for this post
 * @param {string} blurb the flavor text chosen for this map
 */
async function makeVideoPost(content, blurb) {
  // we can't use NPF here. html is allowed in legacy captions though, so let's fake it
  let caption = "";

  // add mapmeta to caption
  if (content.mapInfo.title) {
    caption += "<h2>" + blurb + content.mapInfo.title + "</h2>";
    caption += "<h2>by " + content.mapInfo.author + "</h2>";
    caption += "<h2>" + content.mapInfo.url + "</h2>";
  }

  // add any comments to caption
  if (content.comments.length > 0) {
    for (const p of content.comments) {
      caption += "<p>" + p + "</p>";
    }
  }

  // we can reuse the tags function
  const tags = processTags(content);

  // now get the video ready:
  let video = fs.readFileSync(content.media[0]);
  video = video.toString('base64');

  // prepare to blast!!! i hate it here!!!
  const res = await client.createVideoPost(
    TUMBLR_NAME,
    {
      caption: caption,
      data64: video,
      tags: tags
    }
  )
  return res;
}

/**
 * Uses `content` to construct parameters for a NPF post, then submits the post to Tumblr.
 *
 * Do not use this with video posts. https://github.com/tumblr/docs/issues/88
 *
 * @param {Content} content a Content object for this post
 */
async function makeNpfPost(content, blurb) {
  // handle media, if necessary
  let formData;
  let mediaContent = [];
  if (content.media.length > 0) {
    // destructuring: https://2ality.com/2014/06/es6-multiple-return-values.html
    let { f, m } = processMedia(content.media);
    formData = f; // todo fix this
    mediaContent = m;
  }

  // handle map info, if necessary
  let mapMetaContent = [];
  if (content.mapInfo.title) {
    mapMetaContent = processMapMeta(content.mapInfo, blurb);
  }

  // handle comments, if necessary
  let commentsContent = [];
  if (content.comments.length > 0) {
    commentsContent = processComments(content.comments);
  }

  // handle any tags
  let tags = processTags(content);

  // now slam everything together into the body of our post!
  const post = {
    tags: tags,
    content: [...mediaContent, ...mapMetaContent, ...commentsContent]
  }

  // for debug purposes, print some stuff
  console.log(post);

  // and send it:
  const { response } = await makeNpfRequest(
    "/v2/blog/" + TUMBLR_NAME + "/posts",
    formData,
    post
  );

  return response;
}

async function makeNpfRequest(apiPath, formData, body, method = 'post') {
  // we seem to be doing the weird 'add a new function to the tumblrjs client' thing
  return new Promise((resolve, reject) => {
    client.request[method](
      {
        ...getBaseParams(apiPath),
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        formData: {
          json: JSON.stringify(body),
          ...formData
        }
      },
      (err, _response, body) => {
        if (err) {
          return reject(err);
        }
        try {
          body = JSON.parse(body);
        } catch (e) {
          return reject("malformed response: " + body);
        }
        resolve(body);
      }
    );
  });
}

function processTags(content) {
  // is this a video post that's flashy? if so, tag it
  if (content.flashing && videosContained(content.media).length > 0) {
    content.tags.push(FLASH_TAG);
  }

  return content.tags.join(',');
}

function processComments(comments) {
  let commentsContent = [];
  // just add a standard text block for each paragraph
  for (const p of comments) {
    commentsContent.push({
      type: "text",
      text: p
    });
  }

  return commentsContent;
}

function processMapMeta(mapInfo, blurb) {
  // for now, let's try 'heading2' for map data

  let mapMetaContent = [];

  mapMetaContent.push({
    type: "text",
    subtype: "heading2",
    text: blurb + mapInfo.title
  });

  mapMetaContent.push({
    type: "text",
    subtype: "heading2",
    text: "by: " + mapInfo.author
  });

  mapMetaContent.push({
    type: "text",
    subtype: "heading2",
    text: mapInfo.url
  });

  return mapMetaContent;
}

function processMedia(media) {
  let formData = {};
  let mediaContent = [];
  let i = 0;
  // first build the formdata we need to actually upload our media
  for (const mediaPath of media) {
    formData[`media${i}`] = createReadStream(mediaPath);
    i++;
  }

  // then build the appropriate NPF content block[s]
  // NPF videos are busted. that or tumblr knows how to call the API to make
  // it work, but they're not telling. see: https://github.com/tumblr/docs/issues/88
  mediaContent = media.map((imgPath, index) => {
    return {
      type: 'image',
      media: [
        {
          identifier: `media${index}`
        }
      ]
    }
  });

  return { f: formData, m: mediaContent };
}

/**
 * Returns an array of Content objects for posting this map to Tumblr. Each Content object in the
 * array will be one Tumblr post.
 *
 * With Tumblr, we currently need to break the post up for 1+ of the following conditions:
 * 1) there are more than 10 images
 * 2) there are images and also a video; images and video can't coexist
 * 3) there is more than one video; Tumblr only supports one video upload
 *
 * Some of these constraints may be more fluid in NPF, but it seems best to keep it simple.
 *
 * If postObject meets all of these conditions, this function returns postObject as a 1-element
 * array.
 *
 * todo: add a 'validAsIs' check to skip all this
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
    /* additionally, if there are comments, we don't want them on every post. a potential solution
    is to put them on the last post. this mimics how they were generally used on twitter in v2 and
    isn't great, but is simple */
    if (content.comments) {
      newPost.comments = []; // we'll re-add them to whatever the last one is
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
      p.comments = [];
      return p;
    });
    // add before any videos
    totalPosts = imagePosts.concat(totalPosts);
  }

  // special handling for text-only posts- in this case, totalPosts will be empty here
  if (totalPosts.length === 0) {
    totalPosts.push(content.clone());
  }

  // if comments, add them back to the final post
  const lastPost = totalPosts[totalPosts.length - 1];
  lastPost.comments = content.comments;

  return totalPosts;
}

/**
 * Builds a list containing the image paths for each Tumblr post we're going to make. If the
 * existing list in `content` is fine, this function returns a one-element array containing the
 * existing list. Otherwise, this function tries to divide the images roughly equally among as many
 * lists as needed to keep the images-per-post below TUMBLR_MAX_IMG.
 *
 * `media` should consist of only images, no videos. If you call this function on a list that
 * contains videos, you'll get lists with videos in them, which may not be desirable.
 *
 * Don't call this function with an empty list.
 *
 * @param {string[]} media one map's media; an array of file paths
 * @returns {[string[]]} an array of arrays, where each inner array is the
 * images that should be attached to each post
 */
function computeImagesPerPost(media) {
  let numImages = media.length;
  let numPosts = 1;
  // try dividing images among an increasing number of posts until img-per-post is below the limit
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
 *
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
  postToTumblr: async function (postObject) {
    const blurb = blurbGen.generateBlurb();
    const output = formatForTumblr(postObject);
    console.log("formatted: ");
    console.log(output);

    for (const post of output) {
      let res;
      if (videosContained(post.media).length > 0) {
        res = await makeVideoPost(post, blurb);
      } else {
        res = await makeNpfPost(post, blurb)
      }
      console.log(res);
    }
  }
}