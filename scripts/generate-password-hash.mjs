import { runAuthCli } from "./run-auth-cli.mjs";

await runAuthCli(
  "src/server/auth/cli/generate-password.ts",
  "auth-hash.mjs",
);
