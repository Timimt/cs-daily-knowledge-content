import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { esbuildScript, serverBuildArgs, serverBuildDir } from "./esbuild-path.mjs";

fs.mkdirSync(serverBuildDir, { recursive: true });
const output = path.join(serverBuildDir, "index.mjs");
const result = spawnSync(
  process.execPath,
  [
    esbuildScript,
    ...serverBuildArgs(
    path.join(process.cwd(), "src", "server", "index.ts"),
    output,
    ),
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);

const server = spawn(process.execPath, [output], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
