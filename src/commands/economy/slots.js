const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, V2_FLAG } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

const REELS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];

function payout(reels, bet) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    if (a === "💎") return bet * 10;
    if (a === "7️⃣") return bet * 7;
    return bet * 5;
  }
  if (a === b || b === c || a === c) return bet * 2;
  return 0;
}

module.exports = {
  name: "slots",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Spin the slot machine")
    .addStringOption((option) => option.setName("bet").setDescription("Amount to bet, or 'all'").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const user = economy.getUser(interaction.user.id);
    const raw = interaction.options.getString("bet", true).trim().toLowerCase();

    const bet = raw === "all" ? user.wallet : Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(bet) || bet <= 0) {
      return replyV2(interaction, errorContainer("Enter a positive whole number of coins, or `all`. 🪙"));
    }
    if (bet > user.wallet) {
      return replyV2(interaction, errorContainer(`You only have **${formatFull(user.wallet)}** coins in your wallet. 🪙`));
    }

    // Discord only accepts EPHEMERAL on a deferred callback — the V2 flag goes on the edits below.
    await interaction.deferReply();

    // little spin animation
    const spinDisplay = () => `| ${randomItem(REELS)} | ${randomItem(REELS)} | ${randomItem(REELS)} |`;
    await interaction.editReply({
      components: [container(config.colors.economy, [text(`## 🎰 Spinning…`), text(spinDisplay())])],
      flags: V2_FLAG,
    });
    await new Promise((r) => setTimeout(r, 900));

    const reels = [randomItem(REELS), randomItem(REELS), randomItem(REELS)];
    const won = payout(reels, bet);

    if (won > 0) {
      economy.addMoney(interaction.user.id, "wallet", won - bet);
      await interaction.editReply({
        components: [
          container(config.colors.economy, [
            text(`## 🎰 ${won >= bet * 5 ? "JACKPOT!!" : "You won!"}`),
            text(`| ${reels.join(" | ")} |`),
            text(`You bet **${formatFull(bet)}** and won **${formatFull(won)}** coins 🪙 (+${formatFull(won - bet)})`),
          ]),
        ],
        flags: V2_FLAG,
      });
    } else {
      economy.removeMoney(interaction.user.id, "wallet", bet);
      await interaction.editReply({
        components: [
          container(config.colors.error, [
            text(`## 🎰 No luck…`),
            text(`| ${reels.join(" | ")} |`),
            text(`You lost **${formatFull(bet)}** coins 🪙`),
          ]),
        ],
        flags: V2_FLAG,
      });
    }
  },
};
