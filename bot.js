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
        __dirname + '/public/img-holding/skywatcher.mp4'
      ],
      true,
      ['these are', 'some tags'],
      ["video upload attempt again, because there's a phantom 'undefined' up top. wtf?"]);
    tumblrHandler.postToTumblr(post);
    //makeCall();
  }

  main();
})();