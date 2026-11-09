import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { esbuildScript, serverBuildArgs, serverBuildDir } from "./esbuild-path.mjs";

const entry = path.join(process.cwd(), "src", "server", "index.ts");
fs.mkdirSync(serverBuildDir, { recursive: true });
const output = path.join(serverBuildDir, "index.mjs");
const args = serverBuildArgs(entry, output);

const initialBuild = spawnSync(process.execPath, [esbuildScript, ...args], {
  stdio: "inherit",
});
if (initialBuild.status !== 0) process.exit(initialBuild.status ?? 1);

const server = spawn(process.execPath, [output], {
  stdio: "inherit",
  env: process.env,
});

function shutdown() {
  server.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("exit", (code, signal) => {
  if (signal) process.exit(0);
  process.exit(code ?? 0);
});
