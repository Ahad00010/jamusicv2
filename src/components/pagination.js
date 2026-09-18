const { MessageFlags } = require("discord.js");
const { V2_FLAG, errorContainer, getPagerState, parsePagerId, withNav } = require("../utils/v2");

/**
 * Page-arrow router (`pgn:<token>:<page>`).
 *
 * Pagination used to rely on a message collector, which could never work here:
 * handlers/components.js answers every component interaction first and replies
 * "that interaction has expired or is unknown" for custom ids nobody registered,
 * and that reply beat the collector's update() — so page arrows appeared to be
 * dead and reported an expired interaction. Collectors also timed out after five
 * minutes. This handler has no timeout: every click re-renders the page from the
 * state map in utils/v2, so buttons keep working for as long as the bot runs.
 */
module.exports = function registerPagination(register) {
  register("pgn:", async (interaction) => {
    const target = parsePagerId(interaction.customId);
    if (!target) return;

    const state = getPagerState(target.token);
    if (!state) {
      // The bot restarted since the view was sent (the players are gone too).
      return interaction
        .reply({
          components: [
            errorContainer("That view was sent before my last restart, so I can't rebuild its pages. Run the command again! 🔄"),
          ],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }

    if (interaction.user.id !== state.ownerId) {
      return interaction
        .reply({
          components: [errorContainer("This view belongs to someone else — run the command yourself! 🙅")],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }

    // Views may need a round trip to refresh (a lyrics re-fetch), so acknowledge
    // the click before rendering the page.
    await interaction.deferUpdate();

    const rendered = await state.buildPage(target.page);
    const fresh = rendered && typeof rendered === "object" && rendered.built ? rendered : { built: rendered };
    const totalPages = Math.max(1, fresh.totalPages || state.totalPages);
    const page = Math.min(target.page, totalPages);
    const components = [withNav(fresh.built, target.token, page, totalPages)];

    // Keep the message a Components V2 message (and ephemeral if it was).
    const flags =
      V2_FLAG | (interaction.message?.flags?.has?.(MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 0);

    await interaction.editReply({ components, flags });
  });
};
