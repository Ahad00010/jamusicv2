const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText, V2_FLAG } = require("../../utils/v2");

module.exports = {
  name: "ping",
  category: "general",
  data: new SlashCommandBuilder().setName("ping").setDescription("Check the bot's latency"),
  cooldown: 3,
  async execute(interaction, client) {
    const sent = await interaction.reply({
      components: [container(config.colors.general, [text("## 🏓 Pinging…")])],
      flags: V2_FLAG,
      fetchReply: true,
    });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({
      components: [
        container(config.colors.general, [
          text(`## 🏓 Pong!`),
          separator(),
          text(
            fieldsText([
              { name: "Roundtrip", value: `\`${roundtrip}ms\`` },
              { name: "WebSocket", value: `\`${Math.round(client.ws.ping)}ms\`` },
              { name: "API latency", value: `\`${Math.max(0, roundtrip - Math.round(client.ws.ping))}ms\`` },
            ])
          ),
        ]),
      ],
    });
  },
};
