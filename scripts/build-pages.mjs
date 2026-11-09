import { spawnSync } from "node:child_process";
import path from "node:path";

const repositoryName = process.env.GITHUB_PAGES_REPOSITORY ?? "cs-daily-knowledge-content";
const basePath = `/${repositoryName}/`;
const node = process.execPath;
const contentBuilder = path.join(process.cwd(), "scripts", "build-pages-content.mjs");
const typescript = path.join(process.cwd(), "node_modules", "typescript", "bin", "tsc");
const vite = path.join(process.cwd(), "node_modules", "vite", "bin", "vite.js");

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(node, [contentBuilder]);
run(node, [typescript, "--noEmit"]);
run(node, [vite, "build"], {
  VITE_STATIC_SITE: "true",
  VITE_BASE_PATH: process.env.VITE_BASE_PATH || basePath,
});
