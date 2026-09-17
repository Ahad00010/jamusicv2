const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, text, separator, container } = require("../../utils/v2");

const CATEGORY_META = {
  music: { emoji: "🎵", color: config.colors.music, description: "Playback, queue control, filters and more." },
  general: { emoji: "🌐", color: config.colors.general, description: "Info, utilities and server tools." },
  moderation: { emoji: "🛡️", color: config.colors.moderation, description: "Keep your server safe and tidy." },
  economy: { emoji: "💰", color: config.colors.economy, description: "Coins, shop, gambling and leaderboards." },
  games: { emoji: "🎮", color: config.colors.games, description: "Interactive games to play with friends." },
  config: { emoji: "⚙️", color: config.colors.config, description: "Set up the bot for this server." },
};

function buildOverview(client) {
  const children = [
    text(`## 🎵 JaMusic V2 — Help`),
    text(
      `A modern music & community bot built with **discord.js v14**, **moonlink.js v5** and **Components V2**.\n` +
        `-# ${client.commands.size} commands across ${client.categories.size} categories`
    ),
    separator(),
    text(
      [...client.categories.keys()]
        .map((category) => {
          const meta = CATEGORY_META[category] || { emoji: "📁", description: "" };
          const count = client.categories.get(category).length;
          return `${meta.emoji} **${category}** — ${count} command${count === 1 ? "" : "s"}\n-# ${meta.description}`;
        })
        .join("\n\n")
    ),
    separator(),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help:category")
        .setPlaceholder("Browse a category…")
        .addOptions(
          [...client.categories.keys()].map((category) => {
            const meta = CATEGORY_META[category] || { emoji: "📁" };
            return { label: category, value: category, description: `${client.categories.get(category).length} commands`, emoji: meta.emoji };
          })
        )
    ),
    text(`-# Tip: use </setup:0> to configure welcome messages, DJ roles and mod roles.`),
  ];
  return container(config.colors.primary, children);
}

function buildCategoryView(client, category) {
  const meta = CATEGORY_META[category] || { emoji: "📁", color: config.colors.primary };
  const names = client.categories.get(category) || [];
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("help:back").setLabel("Back to overview").setEmoji("⬅️").setStyle(ButtonStyle.Secondary)
  );
  return container(meta.color ?? config.colors.primary, [
    text(`## ${meta.emoji || "📁"} ${category} commands`),
    separator(),
    text(names.length ? names.map((name) => `\`/${name}\``).join("\n") : "*No commands in this category.*"),
    separator(),
    backRow,
  ]);
}

module.exports = {
  name: "help",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse all commands JaMusic V2 has to offer")
    .addStringOption((option) =>
      option.setName("category").setDescription("Jump straight to a category").addChoices(
        ...Object.keys(CATEGORY_META).map((c) => ({ name: c, value: c }))
      )
    ),
  cooldown: 3,
  async execute(interaction, client) {
    const category = interaction.options.getString("category");
    if (!category) return replyV2(interaction, buildOverview(client));
    return replyV2(interaction, buildCategoryView(client, category));
  },
};

module.exports.CATEGORY_META = CATEGORY_META;
module.exports.buildOverview = buildOverview;
module.exports.buildCategoryView = buildCategoryView;
