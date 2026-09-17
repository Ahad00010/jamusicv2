/** Small id helper for game sessions */
const crypto = require("node:crypto");

function randomId() {
  return crypto.randomBytes(4).toString("hex");
}

module.exports = { randomId };
