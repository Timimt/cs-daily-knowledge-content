import { runAuthCli } from "./run-auth-cli.mjs";

await runAuthCli(
  "src/server/auth/cli/verify-password.ts",
  "auth-verify.mjs",
);
