import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { esbuildScript, serverBuildArgs, serverBuildDir } from "./esbuild-path.mjs";

export async function runAuthCli(entryRelativePath, outputName) {
  fs.mkdirSync(serverBuildDir, { recursive: true });
  const output = path.join(serverBuildDir, outputName);
  const result = spawnSync(
    process.execPath,
    [
      esbuildScript,
      ...serverBuildArgs(
        path.join(process.cwd(), entryRelativePath),
        output,
      ),
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const child = spawn(process.execPath, [output], {
    stdio: "inherit",
    env: process.env,
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Auth CLI stopped by ${signal}.`));
      else resolve(code ?? 1);
    });
  });
  process.exitCode = exitCode;
}
