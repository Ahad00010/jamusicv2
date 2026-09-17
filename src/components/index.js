const musicControls = require("./musicControls");
const games = require("./games");
const configPanel = require("./configPanel");
const helpMenu = require("./helpMenu");
const embedModal = require("./embedModal");

/** Registers every component handler on the router. */
function registerAllComponents(register) {
  musicControls(register);
  games(register);
  configPanel(register);
  helpMenu(register);
  embedModal(register);
}

module.exports = { registerAllComponents };
