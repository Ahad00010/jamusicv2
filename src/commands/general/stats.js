const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText } = require("../../utils/v2");
const { timeAgo } = require("../../utils/format");
const os = require("node:os");

module.exports = {
  name: "stats",
  category: "general",
  data: new SlashCommandBuilder().setName("stats").setDescription("Detailed technical stats about the bot"),
  cooldown: 5,
  async execute(interaction, client) {
    const memory = process.memoryUsage();
    const cpu = os.cpus()[0];
    const load = os.loadavg()[0];

    await replyV2(
      interaction,
      container(config.colors.general, [
        text(`## 📊 Technical Stats`),
        separator(),
        text(
          fieldsText([
            { name: "Uptime", value: `\`${timeAgo(client.uptime)}\`` },
            { name: "Heap used", value: `\`${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB\`` },
            { name: "RSS", value: `\`${(memory.rss / 1024 / 1024).toFixed(1)} MB\`` },
            { name: "CPU", value: `\`${cpu?.model?.trim().slice(0, 40) || "unknown"}\`` },
            { name: "CPU cores", value: `\`${os.cpus().length}\`` },
            { name: "System load", value: `\`${load.toFixed(2)}\`` },
            { name: "Platform", value: `\`${os.platform()} ${os.arch()}\`` },
            { name: "WebSocket ping", value: `\`${Math.round(client.ws.ping)}ms\`` },
            { name: "Guilds / Players", value: `\`${client.guilds.cache.size}\` / \`${client.music.manager.players.size}\`` },
            { name: "NodeLink nodes", value: `\`${client.music.manager.nodes?.size ?? 1}\`` },
          ])
        ),
      ])
    );
  },
};
