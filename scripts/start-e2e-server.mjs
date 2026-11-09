import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";

const root = process.cwd();
const testDirectory = path.join(root, "work", "phase2-e2e");
const testDatabasePath = path.join(testDirectory, "phase2-e2e.db");
const sourceDatabasePath = process.env.E2E_SOURCE_DB
  ? path.resolve(root, process.env.E2E_SOURCE_DB)
  : path.join(root, "data", "cs-daily.db");

fs.rmSync(testDirectory, { recursive: true, force: true });
fs.mkdirSync(testDirectory, { recursive: true });

const source = new Database(sourceDatabasePath, {
  readonly: true,
  fileMustExist: true,
});
await source.backup(testDatabasePath);
source.close();

const password = "Phase2-E2E-Password-2026!";
const salt = crypto.randomBytes(16);
const derived = await new Promise((resolve, reject) => {
  crypto.scrypt(
    password,
    salt,
    64,
    { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
    (error, key) => (error ? reject(error) : resolve(key)),
  );
});
const passwordHash = [
  "scrypt",
  "32768",
  "8",
  "1",
  salt.toString("base64url"),
  derived.toString("base64url"),
].join("$");

const server = spawn(process.execPath, [".server-build/index.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: "3100",
    DATABASE_PATH: testDatabasePath,
    AUTH_PASSWORD_HASH: passwordHash,
    AUTH_SESSION_SECRET: "phase2-e2e-session-secret-at-least-32-bytes",
    AUTH_SESSION_TTL_HOURS: "1",
    AUTH_COOKIE_SECURE: "false",
    GITHUB_SYNC_ENABLED: "false",
  },
});

function shutdown() {
  server.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("exit", (code) => process.exit(code ?? 0));
