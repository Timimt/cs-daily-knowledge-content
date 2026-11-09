import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { esbuildScript, serverBuildArgs, serverBuildDir } from "./esbuild-path.mjs";

fs.mkdirSync(serverBuildDir, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    esbuildScript,
    ...serverBuildArgs(
    path.join(process.cwd(), "src", "server", "index.ts"),
    path.join(serverBuildDir, "index.mjs"),
    ),
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
