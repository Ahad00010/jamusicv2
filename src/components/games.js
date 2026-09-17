const gamesBoard = require("./gamesBoard");
const gamesDuel = require("./gamesDuel");

module.exports = function registerGames(register) {
  gamesBoard(register);
  gamesDuel(register);
};
