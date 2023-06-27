"use strict";
(function () {

  const tumblrHandler = require("./util/tumblr-handler.js");
  // we have a class defined to make handling content objects a little easier
  const Content = require("./util/content.js");

  function main() {
    const post = new Content(
      {
        author: "dickman",
        title: "gm_butts.bsp",
        url: "www.google.com"
      },
      [
        '1', '2', '3', '4',
        '5', '6', '7', '8',
        '9',
      ],
      true,
      ['these are', 'some tags'],
      "and these are some comments that should only appear on the last post!");
    tumblrHandler.postToTumblr(post);
  }

  function getBaseParams(apiPath) {
    // the ellipses here seem to add the k-vs in requestOptions to this object
    return {
      ...client.requestOptions,
      url: client.baseUrl + apiPath,
      oauth: client.credentials
    };
  }

  async function makeNpfRequestForm(apiPath, formData, body, method = 'post') {
    console.log("in makeNpfRequest. apiPath, formData, body:");
    console.log(apiPath);
    console.log(formData);
    console.log(body);
    console.log("baseParams:")
    console.log(getBaseParams(apiPath));
    return new Promise((resolve, reject) => {
      // doing the weird 'add a new function to client' thing, i think?
      // first param seems to be content/body, second is a callback
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

  async function createPhotoPostNpf(images, tags, rawText) {
    const formData = images.reduce((memo, image, index) => {
      memo[`pic${index}`] = createReadStream(image);
      return memo;
    }, {});

    const imageContent = images.map((image, index) => {
      return {
        type: 'image',
        media: [
          {
            identifier: `pic${index}`
          }
        ]
      };
    });

    const textContent = rawText ? { type: 'text', text: rawText } : null;

    const { response } = await makeNpfRequestForm(
      "/v2/blog/" + TUMBLR_NAME + "/posts",
      formData,
      {
        tags: tags.join(','),
        content: [...imageContent, ...(textContent ? [textContent] : [])]
      }
    );
    return response;
  }

  /**
   *
   * @param {*} images i think this is an array of file paths
   * @param {string} text
   * @param {[string]} tags
   */
  async function publish(images, text = null, tags = []) {
    const response = await createPhotoPostNpf(images, tags, text);
    return response;
  }

  async function makeCall() {
    console.log("attempting to post...");
    let res = await publish(['./dummy.jpg', './dummy2.jpg'], "attempting to post NPF pictures");
  }

  main();
})();