const { PermissionFlagsBits } = require("discord.js");
const guildStore = require("../database/guilds");

/** Does the member count as a moderator? (configured mod roles OR ManageGuild perms) */
function isModerator(interaction) {
  const settings = guildStore.getSettings(interaction.guildId);
  if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const modRoleIds = settings.modRoleIds || [];
  return modRoleIds.some((roleId) => interaction.member.roles.cache.has(roleId));
}

/** DJ gate: only enforced when a DJ role is configured in /setup.
 *  Members with ManageGuild always pass. */
function isDJ(interaction) {
  const settings = guildStore.getSettings(interaction.guildId);
  if (!settings.djRoleId) return true;
  if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return interaction.member.roles.cache.has(settings.djRoleId);
}

/** Check role-position hierarchy between executor and target.
 *  Returns null when OK, otherwise a human-readable reason. */
function hierarchyCheck(interaction, targetMember) {
  if (!targetMember) return "That user is not in this server.";
  if (targetMember.id === interaction.user.id) return "You cannot moderate yourself.";
  if (targetMember.id === interaction.client.user.id) return "I refuse to moderate myself! 🤖";

  const executor = interaction.member;
  if (interaction.guild.ownerId === executor.id) return null;

  if (!targetMember.manageable) return `I cannot manage **${targetMember.user.tag}** — check my role position and permissions.`;
  if (executor.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
    return `You cannot moderate **${targetMember.user.tag}** — their highest role is equal to or above yours.`;
  }
  return null;
}

/** Does the bot have these permissions in the channel? */
function botHas(interaction, ...permissions) {
  return interaction.guild.members.me.permissionsIn(interaction.channel).has(permissions);
}

module.exports = { isModerator, isDJ, hierarchyCheck, botHas };
