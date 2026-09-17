const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer, V2_FLAG } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

module.exports = {
  name: "guessnumber",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("guessnumber")
    .setDescription("I pick a number 1-100 — type your guesses in this channel!")
    .addIntegerOption((option) =>
      option.setName("max").setDescription("Upper bound (default 100, max 1000)").setMinValue(10).setMaxValue(1000)
    ),
  cooldown: 5,
  async execute(interaction, client) {
    const max = interaction.options.getInteger("max") ?? 100;
    const answer = Math.floor(Math.random() * max) + 1;

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🔢 Guess the number!`),
        text(`I picked a number between **1** and **${max}**.\nType your guesses right here in <#${interaction.channelId}> — I'll say higher ⬆️ or lower ⬇️.`),
        separator(),
        text(`-# You have 2 minutes. First correct guess wins bragging rights!`),
      ])
    );

    let attempts = 0;
    const collector = interaction.channel.createMessageCollector({
      filter: (m) => m.author.id === interaction.user.id,
      time: 2 * 60 * 1000,
    });

    collector.on("collect", (msg) => {
      const guess = Number(msg.content.trim());
      if (!Number.isInteger(guess) || guess < 1 || guess > max) return;
      attempts++;

      if (guess === answer) {
        collector.stop("guessed");
        msg
          .reply({
            components: [
              container(config.colors.success, [
                text(`## 🎉 Correct!`),
                text(`**${msg.author.username}** guessed **${answer}** in **${attempts}** attempt${attempts === 1 ? "" : "s"}!`),
              ]),
            ],
            flags: V2_FLAG,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      } else if (guess < answer) {
        msg.react("⬆️").catch(() => {});
      } else {
        msg.react("⬇️").catch(() => {});
      }
    });

    collector.on("end", (_collected, reason) => {
      if (reason !== "guessed") {
        interaction
          .followUp({
            components: [
              container(config.colors.warning, [
                text(`## ⏰ Time's up!`),
                text(`The number was **${answer}**. Better luck next time!`),
              ]),
            ],
            flags: V2_FLAG,
          })
          .catch(() => {});
      }
    });
  },
};
