const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

/**
 * Components V2 helpers.
 * Every helper returns builder objects that can be sent with:
 *   interaction.reply({ components: [ ... ], flags: MessageFlags.IsComponentsV2 })
 * Remember: V2 messages cannot also carry `content` or `embeds`.
 */

const V2_FLAG = MessageFlags.IsComponentsV2;

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator(divider = true, spacing = SeparatorSpacingSize.Small) {
  return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}

function thumbnail(url, description) {
  const builder = new ThumbnailBuilder().setURL(url);
  if (description) builder.setDescription(description);
  return builder;
}

function mediaGallery(items) {
  const gallery = new MediaGalleryBuilder();
  for (const item of items) {
    const builder = new MediaGalleryItemBuilder().setURL(item.url);
    if (item.description) builder.setDescription(item.description);
    gallery.addItems(builder);
  }
  return gallery;
}

/** Generic container builder: pass already-built children */
function container(accentColor, children) {
  const c = new ContainerBuilder();
  if (accentColor != null) c.setAccentColor(accentColor);
  for (const child of children) {
    if (child instanceof ActionRowBuilder) c.addActionRowComponents(child);
    else if (child instanceof SectionBuilder) c.addSectionComponents(child);
    else if (child instanceof SeparatorBuilder) c.addSeparatorComponents(child);
    else if (child instanceof MediaGalleryBuilder) c.addMediaGalleryComponents(child);
    else if (child instanceof TextDisplayBuilder) c.addTextDisplayComponents(child);
    else if (typeof child === "string") c.addTextDisplayComponents(text(child));
    else {
      throw new TypeError(
        `container(): unsupported child of type ${child?.constructor?.name ?? typeof child} — pass TextDisplay/Section/Separator/MediaGallery/ActionRow builders`
      );
    }
  }
  return c;
}

/** Field-ish layout for info panels: "**label:** value" lines */
function fieldsText(fields) {
  return fields
    .filter((f) => f && f.value !== undefined && f.value !== null)
    .map((f) => `**${f.name}:** ${f.value}`)
    .join("\n");
}

function infoContainer({ color, title, description, fields, footer, thumbnailUrl, image, rows }) {
  const children = [];
  if (title) {
    if (thumbnailUrl) {
      // Sections require exactly one accessory (thumbnail or button) — only use one
      // when we actually have artwork, otherwise fall back to plain text displays.
      const section = new SectionBuilder().addTextDisplayComponents(text(`## ${title}`));
      if (description) section.addTextDisplayComponents(text(description));
      section.setThumbnailAccessory(thumbnail(thumbnailUrl));
      children.push(section);
    } else {
      children.push(text(`## ${title}`));
      if (description) children.push(text(description));
    }
  } else if (description) {
    children.push(text(description));
  }
  if (fields && fields.length) {
    if (title || description) children.push(separator());
    children.push(text(fieldsText(fields)));
  }
  if (image) {
    children.push(separator());
    children.push(mediaGallery([{ url: image }]));
  }
  if (rows && rows.length) {
    children.push(separator());
    for (const row of rows) children.push(row);
  }
  if (footer) {
    children.push(separator());
    children.push(text(`-# ${footer}`));
  }
  return container(color, children);
}

function successContainer(message, { title = "✅ Success", rows, footer } = {}) {
  const children = [text(`## ${title}`), separator(), text(message)];
  if (rows) for (const row of rows) children.push(row);
  if (footer) children.push(text(`-# ${footer}`));
  return container(0x57f287, children);
}

function errorContainer(message, { title = "❌ Error", hint, rows } = {}) {
  const children = [text(`## ${title}`), separator(), text(message)];
  if (hint) children.push(text(`-# 💡 ${hint}`));
  if (rows) for (const row of rows) children.push(row);
  return container(0xed4245, children);
}

function warningContainer(message, { title = "⚠️ Warning", rows, footer } = {}) {
  const children = [text(`## ${title}`), separator(), text(message)];
  if (rows) for (const row of rows) children.push(row);
  if (footer) children.push(text(`-# ${footer}`));
  return container(0xfee75c, children);
}

/** Navigation row for paginated V2 messages */
function navRow(baseId, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pgn:${baseId}:first`)
      .setLabel("«")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`pgn:${baseId}:prev`)
      .setLabel("‹")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`pgn:${baseId}:page`)
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`pgn:${baseId}:next`)
      .setLabel("›")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId(`pgn:${baseId}:last`)
      .setLabel("»")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages)
  );
}

/** Disables every button of an existing nav row (for expiry). */
function disableNavRow(row) {
  for (const button of row.components) button.setDisabled(true);
  return row;
}

/**
 * Paginated V2 message with « ‹ page › » buttons.
 * buildPage(page) must return a ContainerBuilder WITHOUT the nav row — it is appended here.
 * Page state lives in this module (keyed by baseId) so buttons stay stateless.
 */
const paginationState = new Map(); // baseId -> { page, totalPages, buildPage, ownerId, messageId }

// `deferred`: the caller already deferred (so editReply is used instead of reply);
// `startPage`: first page to render (e.g. the page holding the current lyric line).
async function paginate(
  interaction,
  { id, totalPages, buildPage, ephemeral = false, deferred = false, startPage = 1 }
) {
  totalPages = Math.max(1, totalPages);
  const baseId = `${id}:${interaction.id}`;
  const state = {
    page: Math.min(Math.max(1, startPage), totalPages),
    totalPages,
    buildPage,
    ownerId: interaction.user.id,
  };
  paginationState.set(baseId, state);

  const sendPayload = (p) => ({
    components: [withNav(buildPage(p), baseId, p, totalPages)],
    flags: ephemeral ? V2_FLAG | MessageFlags.Ephemeral : V2_FLAG,
  });

  if (deferred) await interaction.editReply(sendPayload(state.page));
  else await interaction.reply(sendPayload(state.page));
  const reply = await interaction.fetchReply();
  state.messageId = reply.id;

  const collector = reply.createMessageComponentCollector({ time: 5 * 60 * 1000 });
  collector.on("collect", async (i) => {
    const prefix = `pgn:${baseId}:`;
    if (!i.customId.startsWith(prefix)) return;
    const action = i.customId.slice(prefix.length);
    if (i.user.id !== state.ownerId) {
      return i.reply({
        components: [errorContainer("This pagination belongs to someone else — run the command yourself! 🙅")],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      });
    }
    if (action === "first") state.page = 1;
    else if (action === "prev") state.page = Math.max(1, state.page - 1);
    else if (action === "next") state.page = Math.min(totalPages, state.page + 1);
    else if (action === "last") state.page = totalPages;
    else return;
    await i.update(sendPayload(state.page));
  });

  collector.on("end", async (_collected, reason) => {
    paginationState.delete(baseId);
    if (reason !== "time") return;
    try {
      const msg = await interaction.channel.messages.fetch(reply.id).catch(() => null);
      if (msg && msg.editable) {
        await msg.edit({ components: [withNav(buildPage(state.page), baseId, state.page, totalPages, true)] });
      }
    } catch {
      /* message may be gone */
    }
  });

  return reply;
}

function withNav(built, baseId, page, totalPages, disabled = false) {
  const row = navRow(baseId, page, totalPages);
  if (disabled) disableNavRow(row);
  built.addActionRowComponents(row);
  return built;
}

/** Reply helper: everything goes through Components V2 */
function replyV2(interaction, built, { ephemeral = false, files = [] } = {}) {
  const payload = { components: Array.isArray(built) ? built : [built], flags: V2_FLAG };
  if (ephemeral) payload.flags |= MessageFlags.Ephemeral;
  if (files && files.length) payload.files = files;
  return interaction.reply(payload);
}

function editReplyV2(interaction, built, { files = [] } = {}) {
  const payload = {
    components: Array.isArray(built) ? built : [built],
    // Discord only allows EPHEMERAL on a deferred callback, so a deferred reply starts out
    // as a plain message. IS_COMPONENTS_V2 IS an editable flag, so the "edit original
    // response" call is the documented place to switch the message to Components V2.
    flags: interaction.ephemeral ? V2_FLAG | MessageFlags.Ephemeral : V2_FLAG,
  };
  if (files && files.length) payload.files = files;
  return interaction.editReply(payload);
}

module.exports = {
  V2_FLAG,
  text,
  separator,
  thumbnail,
  mediaGallery,
  container,
  infoContainer,
  successContainer,
  errorContainer,
  warningContainer,
  fieldsText,
  navRow,
  paginate,
  replyV2,
  editReplyV2,
};
