const cohost = require("cohost");
const KEYS = require("./credentials.json");

(async function () {
  // Create User and authenticate
  let user = new cohost.User();
  await user.login(KEYS.cohost.email, KEYS.cohost.pass);

  // Get first Project of user
  let [project] = await user.getProjects();

  // Create Post
  const post = {
    postState: 1,
    headline: "still testing stuff with cohost.js",
    adultContent: false,
    blocks: [],
    cws: [],
    tags: []
  };
  const content = {
    type: "markdown",
    markdown: { content: "i'm marking down!! i'm a markdowner!!! assuming i've read this library correctly. does **bold** work" }
  }
  post.blocks.push(content);
  try {
    await cohost.Post.create(project, post);
  } catch (err) {
    console.error(err);
  }


  // Create a draft with attachments

  // // 1. Create a draft
  // const draftId = await cohost.Post.create(myProject, basePost);

  // // 2. Upload the attachment
  // const attachmentData = await myProject.uploadAttachment(
  //   draftId,
  //   path.resolve(__dirname, "./02-15_One_pr.png")
  // );
})();