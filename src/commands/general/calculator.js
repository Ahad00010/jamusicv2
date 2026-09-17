const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");

/** Safely evaluates a basic arithmetic expression. */
function calculate(expression) {
  if (!/^[\d\s+\-*/%().^]+$/.test(expression)) return null;
  const normalized = expression.replace(/\^/g, "**");
  try {
    const result = Function(`"use strict"; return (${normalized});`)();
    if (typeof result !== "number" || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

module.exports = {
  name: "calculator",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("calculator")
    .setDescription("Evaluate a math expression")
    .addStringOption((option) =>
      option.setName("expression").setDescription("e.g. (2 + 3) * 4 / 10").setRequired(true)
    ),
  cooldown: 3,
  async execute(interaction, client) {
    const expression = interaction.options.getString("expression", true).slice(0, 200);
    const result = calculate(expression);

    if (result == null) {
      return replyV2(
        interaction,
        errorContainer("That expression is invalid or too complex. Only `+ - * / % ( ) ^` and numbers are allowed. 🧮")
      );
    }

    const pretty = Number.isInteger(result) ? String(result) : result.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");

    await replyV2(
      interaction,
      container(config.colors.general, [
        text(`## 🧮 Calculator`),
        text(`**Expression:**\n\`${expression}\``),
        text(`**Result:**\n\`${pretty}\``),
      ])
    );
  },
};
