const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, V2_FLAG, errorContainer } = require("../../utils/v2");
const { truncate } = require("../../utils/format");

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

module.exports = {
  name: "poll",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll with up to 10 options")
    .addStringOption((option) => option.setName("question").setDescription("Poll question").setRequired(true))
    .addStringOption((option) => option.setName("options").setDescription("Options separated by commas (2-10)").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("minutes").setDescription("How long the poll runs (default 5 minutes)").setMinValue(1).setMaxValue(1440)
    ),
  cooldown: 5,
  async execute(interaction, client) {
    const question = interaction.options.getString("question", true);
    const options = interaction.options
      .getString("options", true)
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const minutes = interaction.options.getInteger("minutes") ?? 5;

    if (options.length < 2 || options.length > 10) {
      return replyV2(interaction, errorContainer("Please provide between **2** and **10** options, separated by commas. 📊"));
    }

    const counts = new Map(options.map((_, i) => [String(i), new Set()]));
    const children = [
      text(`## 📊 ${truncate(question, 180)}`),
      text(options.map((o, i) => `${NUMBER_EMOJIS[i]} ${truncate(o, 80)}`).join("\n")),
      separator(),
      text(`-# Poll by ${interaction.user} • Ends <t:${Math.floor((Date.now() + minutes * 60000) / 1000)}:R>`),
    ];

    await replyV2(interaction, container(config.colors.primary, children), { fetchReply: true });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ time: minutes * 60000 });
    collector.on("collect", (i) => {
      // Vote buttons are attached below
      const index = i.customId.split(":")[2];
      for (const voters of counts.values()) voters.delete(i.user.id);
      counts.get(index).add(i.user.id);
      const total = [...counts.values()].reduce((a, s) => a + s.size, 0);
      i.reply({
        components: [
          container(config.colors.success, [
            text(`## 🗳️ Vote recorded`),
            text(`You voted **${truncate(options[Number(index)], 60)}**.\n-# ${total} total vote${total === 1 ? "" : "s"} so far`),
          ]),
        ],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      }).catch(() => {});
    });
    collector.on("end", async () => {
      const total = [...counts.values()].reduce((a, s) => a + s.size, 0);
      const results = options
        .map((o, i) => {
          const count = counts.get(String(i)).size;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return `${NUMBER_EMOJIS[i]} ${truncate(o, 40)} — **${count}** (\`${pct}%\`)`;
        })
        .join("\n");
      await message
        .edit({
          components: [
            container(config.colors.primary, [
              text(`## 📊 ${truncate(question, 160)}`),
              separator(),
              text(results || "*No votes*"),
              separator(),
              text(`-# Poll by ${interaction.user} • **Ended** • ${total} vote${total === 1 ? "" : "s"}`),
            ]),
          ],
        })
        .catch(() => {});
    });

    // Attach vote buttons to the poll message
    const rows = [];
    for (let r = 0; r < Math.ceil(options.length / 5); r++) {
      const row = new ActionRowBuilder();
      for (let i = r * 5; i < Math.min((r + 1) * 5, options.length); i++) {
        row.addComponents(
          new ButtonBuilder().setCustomId(`poll:${message.id}:${i}`).setLabel(`Option ${i + 1}`).setStyle(ButtonStyle.Secondary)
        );
      }
      rows.push(row);
    }
    await message.edit({ components: [container(config.colors.primary, children.slice(0, -1)), ...rows] }).catch(() => {});
  },
};
