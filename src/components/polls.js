/**
 * `/poll` vote handling.
 *
 * Vote buttons used to be served by a message component collector on the poll
 * message, but that can never work here: handlers/components.js routes EVERY
 * component interaction first and answers "that interaction has expired or is
 * unknown" for custom ids nobody registered — that reply always beat the
 * collector, so every vote bounced off with a generic error and the
 * collector's own reply() died on InteractionAlreadyReplied inside a silent
 * catch. This module registers the missing `poll:` handler and owns the tally
 * instead, so votes are recorded and confirmed instantly and the results edit
 * runs on a plain timer (plus a lazy finalize when somebody clicks after the
 * deadline).
 *
 * State is in-memory, like the `pgn:` pager state in utils/v2.js: it lives for
 * as long as the bot runs and is capped at POLL_STATE_LIMIT entries. If the
 * bot restarts mid-poll the tally is gone — clicks then say so, and the poll
 * message keeps its buttons (its results can no longer be posted).
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const config = require("../config");
const { container, text, separator, errorContainer, V2_FLAG } = require("../utils/v2");
const { truncate } = require("../utils/format");

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const POLL_STATE_LIMIT = 200;
const polls = new Map(); // poll message id -> state

function ephemeralReply(interaction, built) {
  return interaction
    .reply({ components: [built], flags: V2_FLAG | MessageFlags.Ephemeral })
    .catch(() => {});
}

/** Vote rows for a poll: `poll:<index>`, parsed by the handler below. */
function voteRows(options) {
  const rows = [];
  for (let r = 0; r < Math.ceil(options.length / 5); r++) {
    const row = new ActionRowBuilder();
    for (let i = r * 5; i < Math.min((r + 1) * 5, options.length); i++) {
      row.addComponents(
        new ButtonBuilder().setCustomId(`poll:${i}`).setLabel(`Option ${i + 1}`).setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Edits the poll message with the final results and drops the state.
 * Safe to call more than once (the timer and a post-deadline click can race).
 */
async function finalizePoll(client, messageId) {
  const state = polls.get(messageId);
  if (!state || state.finalized) return;
  state.finalized = true;
  if (state.timer) clearTimeout(state.timer);
  polls.delete(messageId);

  const total = [...state.counts.values()].reduce((a, s) => a + s.size, 0);
  const results = state.options
    .map((o, i) => {
      const count = state.counts.get(String(i))?.size ?? 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `${NUMBER_EMOJIS[i]} ${truncate(o, 40)} — **${count}** (\`${pct}%\`)`;
    })
    .join("\n");

  const channel =
    client.channels.cache.get(state.channelId) ?? (await client.channels.fetch(state.channelId).catch(() => null));
  const message = channel
    ? (channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId).catch(() => null)))
    : null;
  if (!message) return;

  await message
    .edit({
      components: [
        container(config.colors.primary, [
          text(`## 📊 ${truncate(state.question, 160)}`),
          separator(),
          text(results || "*No votes*"),
          separator(),
          text(`-# Poll by <@${state.ownerId}> • **Ended** • ${total} vote${total === 1 ? "" : "s"}`),
        ]),
      ],
    })
    .catch(() => {});
}

/**
 * Starts tracking a freshly posted poll message (called by /poll).
 * `message` is the fetched reply, so state is keyed by the id of the message
 * the vote buttons live on; the buttons themselves carry only the option index.
 */
function createPollVoteState(client, message, { question, options, ownerId, endsAt }) {
  while (polls.size >= POLL_STATE_LIMIT) {
    const oldest = polls.keys().next().value;
    const evicted = polls.get(oldest);
    if (evicted?.timer) clearTimeout(evicted.timer);
    polls.delete(oldest);
  }

  const state = {
    question,
    options,
    ownerId,
    endsAt,
    channelId: message.channelId,
    finalized: false,
    counts: new Map(options.map((_, i) => [String(i), new Set()])),
    timer: null,
  };
  polls.set(message.id, state);

  state.timer = setTimeout(() => {
    state.timer = null;
    finalizePoll(client, message.id).catch(() => {});
  }, Math.max(0, endsAt - Date.now()));
  // A pending deadline must not keep the process alive on shutdown.
  state.timer.unref?.();

  return state;
}

/** Handler for every `poll:<index>` vote button. */
async function handlePollVote(interaction) {
  const rawIndex = interaction.customId.slice("poll:".length);
  const state = polls.get(interaction.message?.id);

  if (!state) {
    return ephemeralReply(
      interaction,
      errorContainer("I'm no longer tracking that poll — it either ended or I restarted since it was created. 🔄")
    );
  }

  if (state.finalized || Date.now() >= state.endsAt) {
    await finalizePoll(interaction.client, interaction.message.id).catch(() => {});
    return ephemeralReply(
      interaction,
      errorContainer("That poll has ended — the final results are on the poll message. 📊")
    );
  }

  if (!/^\d+$/.test(rawIndex) || Number(rawIndex) >= state.options.length) {
    return ephemeralReply(interaction, errorContainer("That option doesn't exist in this poll. 🤔"));
  }

  const index = Number(rawIndex);
  // Single-choice with re-voting: drop the voter from every option, then count
  // them for the one they picked (same semantics the collector had).
  for (const voters of state.counts.values()) voters.delete(interaction.user.id);
  state.counts.get(String(index)).add(interaction.user.id);
  const total = [...state.counts.values()].reduce((a, s) => a + s.size, 0);

  return ephemeralReply(
    interaction,
    container(config.colors.success, [
      text(`## 🗳️ Vote recorded`),
      text(
        `You voted **${truncate(state.options[index], 60)}**.\n-# ${total} total vote${total === 1 ? "" : "s"} so far`
      ),
    ])
  );
}

module.exports = function registerPolls(register) {
  register("poll:", handlePollVote);
};
module.exports.NUMBER_EMOJIS = NUMBER_EMOJIS;
module.exports.voteRows = voteRows;
module.exports.createPollVoteState = createPollVoteState;
module.exports.finalizePoll = finalizePoll;