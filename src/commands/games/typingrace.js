const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, V2_FLAG } = require("../../utils/v2");
const economy = require("../../database/economy");

const SENTENCES = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "music is the strongest form of magic",
  "never trust a computer you cannot throw out a window",
  "a smooth sea never made a skilled sailor",
  "the best way out is always through",
];

module.exports = {
  name: "typingrace",
  category: "games",
  data: new SlashCommandBuilder().setName("typingrace").setDescription("Type the sentence first — anyone can join!"),
  cooldown: 10,
  async execute(interaction, client) {
    const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## ⌨️ Typing Race!`),
        text(`Type this exactly — **first correct answer wins**:\n\n\`\`\`${sentence}\`\`\``),
        separator(),
        text(`-# Race starts in **3 seconds**…`),
      ])
    );

    await new Promise((r) => setTimeout(r, 3000));

    await interaction
      .followUp({
        components: [container(config.colors.warning, [text(`## 🏁 GO! Type the sentence now!`)])],
        flags: V2_FLAG,
      })
      .catch(() => {});

    const startTime = Date.now();
    const collector = interaction.channel.createMessageCollector({ time: 60 * 1000 });

    collector.on("collect", (msg) => {
      if (msg.author.bot) return;
      if (msg.content.trim().toLowerCase() === sentence) {
        const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
        collector.stop("winner");
        economy.addGameStat(msg.author.id, "typingrace", true);
        msg
          .reply({
            components: [
              container(config.colors.success, [
                text(`## 🏆 ${msg.author.username} wins!`),
                text(`Typed it in **${seconds}s** — lightning fingers! ⚡`),
              ]),
            ],
            flags: V2_FLAG,
            allowedMentions: { parse: [] },
          })
          .catch(() => {});
      }
    });

    collector.on("end", (_collected, reason) => {
      if (reason !== "winner") {
        interaction
          .followUp({
            components: [container(config.colors.error, [text(`## ⏰ Nobody typed it in time!`), text(`The sentence was:\n\`\`\`${sentence}\`\`\``)])],
            flags: V2_FLAG,
          })
          .catch(() => {});
      }
    });
  },
};
