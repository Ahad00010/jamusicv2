/**
 * Installs the bundled NodeLink's dependencies (nodelink/node_modules).
 * Runs automatically via the "postinstall" npm hook and from scripts/start.js.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const NODELINK_DIR = path.join(__dirname, "..", "nodelink");

function main() {
  if (!fs.existsSync(path.join(NODELINK_DIR, "package.json"))) {
    console.error("❌ nodelink/ is missing from the repo — it must be committed alongside src/.");
    process.exit(1);
  }

  if (fs.existsSync(path.join(NODELINK_DIR, "node_modules"))) {
    console.log("📦 NodeLink dependencies already installed.");
    return;
  }

  console.log("📦 Installing NodeLink dependencies (one-time; requires git)…");
  // Prefer invoking npm via its CLI entry with Node to avoid Windows shell-quoting pitfalls.
  const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  const result = fs.existsSync(npmCli)
    ? spawnSync(process.execPath, [npmCli, "install", "--no-audit", "--no-fund", "--loglevel=error"], {
        cwd: NODELINK_DIR,
        stdio: "inherit",
      })
    : spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
        cwd: NODELINK_DIR,
        stdio: "inherit",
        shell: process.platform === "win32",
      });

  if (result.status !== 0) {
    console.error("❌ NodeLink dependency installation failed — see the output above.");
    process.exit(result.status ?? 1);
  }
  console.log("✅ NodeLink dependencies installed.");
}

main();
