const fs = require("node:fs");
const path = require("node:path");
const { Collection } = require("discord.js");

/** Loads slash commands from src/commands/<category>/*.js into a Collection. */
function loadCommands(commandsDir) {
  const commands = new Collection();
  const categories = new Collection(); // categoryName -> command names[]

  if (!fs.existsSync(commandsDir)) return { commands, categories };

  for (const entry of fs.readdirSync(commandsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const category = entry.name;
    const files = fs.readdirSync(path.join(commandsDir, category)).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(commandsDir, category, file);
      let command;
      try {
        command = require(filePath);
      } catch (error) {
        console.error(`[Commands] Failed to load ${filePath}:`, error.message);
        continue;
      }
      if (!command?.data || !command?.execute) {
        console.warn(`[Commands] Skipping ${filePath}: missing "data" or "execute".`);
        continue;
      }
      command.category = command.category || category;
      commands.set(command.data.name, command);
      if (!categories.has(command.category)) categories.set(command.category, []);
      categories.get(command.category).push(command.data.name);
    }
  }

  return { commands, categories };
}

module.exports = { loadCommands };
