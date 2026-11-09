import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { esbuildScript, serverBuildArgs, serverBuildDir } from "./esbuild-path.mjs";

fs.mkdirSync(serverBuildDir, { recursive: true });
const output = path.join(serverBuildDir, "init.mjs");
const result = spawnSync(
  process.execPath,
  [
    esbuildScript,
    ...serverBuildArgs(
    path.join(process.cwd(), "src", "server", "db", "init-entry.ts"),
    output,
    ),
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await import(`file://${output.replaceAll("\\", "/")}`);
