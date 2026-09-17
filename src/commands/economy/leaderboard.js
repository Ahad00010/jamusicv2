const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, paginate } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

const FIELDS = {
  wallet: { label: "Wallet", emoji: "👛" },
  bank: { label: "Bank", emoji: "🏦" },
  net: { label: "Net worth", emoji: "💰" },
  xp: { label: "XP", emoji: "⭐" },
};

module.exports = {
  name: "leaderboard",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Server economy & XP leaderboards")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Which leaderboard?")
        .addChoices(
          { name: "💰 Net worth", value: "net" },
          { name: "👛 Wallet", value: "wallet" },
          { name: "🏦 Bank", value: "bank" },
          { name: "⭐ XP", value: "xp" }
        )
    ),
  cooldown: 3,
  async execute(interaction, client) {
    const type = interaction.options.getString("type") ?? "net";

    let rows;
    if (type === "net") {
      const walletRows = economy.getLeaderboard("wallet", 100);
      const bankRows = economy.getLeaderboard("bank", 100);
      const totals = new Map();
      for (const row of walletRows) totals.set(row.userId, (totals.get(row.userId) || 0) + row.value);
      for (const row of bankRows) totals.set(row.userId, (totals.get(row.userId) || 0) + row.value);
      rows = [...totals.entries()]
        .map(([userId, value]) => ({ userId, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 100);
    } else {
      rows = economy.getLeaderboard(type, 100).map((r) => ({ userId: r.userId, value: r.value }));
    }

    const meta = FIELDS[type] || FIELDS.net;
    const PER_PAGE = 10;
    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));

    await paginate(interaction, {
      id: `lb:${type}:${interaction.guildId}`,
      totalPages,
      buildPage: (page) => {
        const slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
        const medals = ["🥇", "🥈", "🥉"];
        const lines = slice
          .map((row, i) => {
            const rank = (page - 1) * PER_PAGE + i + 1;
            const medal = medals[rank - 1] || `\`${rank}.\``;
            return `${medal} <@${row.userId}> — **${formatFull(row.value)}**`;
          })
          .join("\n");
        return container(config.colors.economy, [
          text(`## 🏆 ${meta.emoji} ${meta.label} Leaderboard`),
          separator(),
          text(lines || "*No entries yet — go earn some coins!*"),
          separator(),
          text(`-# Page ${page}/${totalPages} • Values are global across all servers`),
        ]);
      },
    });
  },
};
