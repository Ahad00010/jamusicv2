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

console.log(`\n${files.length - failed}/${files.length} files passed.`);
process.exit(failed ? 1 : 0);
