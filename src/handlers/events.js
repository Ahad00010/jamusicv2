const fs = require("node:fs");
const path = require("node:path");

/** Loads event modules from a directory and binds them to the client. */
function loadEvents(client, eventsDir) {
  if (!fs.existsSync(eventsDir)) return 0;
  let count = 0;
  for (const file of fs.readdirSync(eventsDir).filter((f) => f.endsWith(".js"))) {
    const filePath = path.join(eventsDir, file);
    let event;
    try {
      event = require(filePath);
    } catch (error) {
      console.error(`[Events] Failed to load ${filePath}:`, error.message);
      continue;
    }
    const handler = async (...args) => {
      try {
        await event.execute(...args, client);
      } catch (error) {
        // Event bugs must not escape as unhandled rejections — log and carry on.
        console.error(`[Events] Error in ${event.name}:`, error);
      }
    };
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
    count++;
  }
  return count;
}

module.exports = { loadEvents };
