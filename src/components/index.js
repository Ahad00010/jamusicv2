const musicControls = require("./musicControls");
const games = require("./games");
const configPanel = require("./configPanel");
const helpMenu = require("./helpMenu");
const embedModal = require("./embedModal");
const pagination = require("./pagination");
const polls = require("./polls");

/** Registers every component handler on the router. */
function registerAllComponents(register) {
  musicControls(register);
  games(register);
  configPanel(register);
  helpMenu(register);
  embedModal(register);
  pagination(register);
  polls(register);
}

module.exports = { registerAllComponents };
