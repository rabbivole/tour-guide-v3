const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const cookieParser = require("cookie-parser");
function authorizeUser(req, res, next) {
  try {
    next();

  } catch (err) {
    res.status(500).json({ msg: "bruh" });
  }
}

module.exports = { authorizeUser }