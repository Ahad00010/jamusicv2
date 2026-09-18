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

/**
 * Pagination state, keyed by the short token page buttons carry in their custom
 * id (`pgn:<token>:<page>`). Clicks are served by a real component handler
 * (components/pagination.js) instead of a message collector, because:
 *   1. handlers/components.js routes EVERY component interaction first and
 *      replies "that interaction has expired or is unknown" for a custom id
 *      nobody registered — that reply won the race against a collector's
 *      update(), so page arrows never turned a page.
 *   2. Collectors die with their timeout, which killed long-lived views.
 * Entries here have no time limit: they are only dropped once
 * PAGER_STATE_LIMIT of them pile up, or when the bot restarts (a restart empties
 * the players too, so nothing paged survives meaningfully anyway).
 */
const PAGER_PREFIX = "pgn";
const PAGER_STATE_LIMIT = 400;
const pagerState = new Map(); // token -> { id, buildPage, ownerId, totalPages }
let pagerSeq = 0;

function pagerSlug(value) {
  const slug = String(value || "view")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug || "view";
}

function pagerId(token, page) {
  return `${PAGER_PREFIX}:${token}:${page}`;
}

/** Splits a `pgn:<token>:<page>` custom id; returns null when it is not one. */
function parsePagerId(customId) {
  const [prefix, token, page] = String(customId || "").split(":");
  if (prefix !== PAGER_PREFIX || !token || !page) return null;
  return { token, page: Math.max(1, Number(page) || 1) };
}

/** Pagination state for a token, or null after a restart / eviction. */
function getPagerState(token) {
  return pagerState.get(token) || null;
}

/** Navigation row for paginated V2 messages — every button knows its own page. */
function navRow(token, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(pagerId(token, 1))
      .setLabel("«")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(pagerId(token, Math.max(1, page - 1)))
      .setLabel("‹")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(pagerId(token, page))
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(pagerId(token, Math.min(totalPages, page + 1)))
      .setLabel("›")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId(pagerId(token, totalPages))
      .setLabel("»")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages)
  );
}



/**
 * Paginated V2 message with page buttons that never expire.
 * buildPage(page) may return a ContainerBuilder, or `{ built, totalPages }` when a
 * view can refresh its own page count (a queue grows, a new song starts, …).
 * The nav row is appended here, and every button carries its own page number, so
 * clicks are rendered on demand by the pgn: handler (components/pagination.js).
 */
function unwrapPage(rendered) {
  if (rendered && typeof rendered === "object" && rendered.built) {
    return { built: rendered.built, totalPages: rendered.totalPages ?? null };
  }
  return { built: rendered, totalPages: null };
}

// `deferred`: the caller already deferred (so editReply is used instead of reply);
// `startPage`: first page to render (e.g. the page holding the current lyric line).
async function paginate(
  interaction,
  { id = "view", totalPages, buildPage, ephemeral = false, deferred = false, startPage = 1 }
) {
  const token = `${pagerSlug(id)}-${++pagerSeq}`;
  const state = {
    id,
    buildPage,
    ownerId: interaction.user.id,
    totalPages: Math.max(1, totalPages),
  };
  pagerState.set(token, state);
  while (pagerState.size > PAGER_STATE_LIMIT) pagerState.delete(pagerState.keys().next().value);

  const first = unwrapPage(await buildPage(Math.min(Math.max(1, startPage), state.totalPages)));
  state.totalPages = Math.max(1, first.totalPages || state.totalPages);
  const page = Math.min(Math.max(1, startPage), state.totalPages);

  const payload = {
    components: [withNav(first.built, token, page, state.totalPages)],
    flags: ephemeral ? V2_FLAG | MessageFlags.Ephemeral : V2_FLAG,
  };
  return deferred ? interaction.editReply(payload) : interaction.reply(payload);
}

function withNav(built, token, page, totalPages) {
  built.addActionRowComponents(navRow(token, page, totalPages));
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
  withNav,
  parsePagerId,
  getPagerState,
  replyV2,
  editReplyV2,
};
