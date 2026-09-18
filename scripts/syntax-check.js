/**
 * Syntax-checks every .js file under src/ and scripts/ using `node --check`.
 * Usage: npm run check
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const targets = [path.join(ROOT, "src"), path.join(ROOT, "scripts")];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = targets.flatMap((t) => walk(t));
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    console.log(`✅ ${path.relative(ROOT, file)}`);
  } catch (error) {
    failed++;
    console.error(`❌ ${path.relative(ROOT, file)}`);
    console.error(error.stderr?.toString() || error.message);
  }
}

/**
 * Interaction-response rules that `node --check` cannot catch. Discord rejects
 * `MessageFlags.IsComponentsV2` on a deferred callback (only EPHEMERAL is
 * allowed there) and the failure only shows up at click time as the generic
 * "Something went wrong while handling that interaction" reply.
 */
const INTERACTION_RULES = [
  {
    pattern: /deferReply\s*\([^)]*V2_FLAG/,
    message:
      "deferReply() cannot carry IS_COMPONENTS_V2 — defer with MessageFlags.Ephemeral and set the V2 flag on the edit (editReplyV2 / paginate).",
  },
];

let violations = 0;

for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const rule of INTERACTION_RULES) {
    lines.forEach((line, index) => {
      if (!rule.pattern.test(line)) return;
      violations++;
      console.error(`❌ ${path.relative(ROOT, file)}:${index + 1} — ${rule.message}`);
      console.error(`   ${line.trim()}`);
    });
  }
}

if (violations) {
  console.error(`\n${violations} interaction rule violation${violations === 1 ? "" : "s"}.`);
}

console.log(`\n${files.length - failed}/${files.length} files passed.`);
process.exit(failed || violations ? 1 : 0);
