import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  passwordsMatch,
  TerminalPasswordParser,
} from "../../src/server/auth/cli/password-input";
import { verifyPasswordFromEnvironment } from "../../src/server/auth/cli/operations";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";

function parseChunks(chunks: string[]): Pick<
  TerminalPasswordParser,
  "value" | "completed" | "cancelled"
> {
  const parser = new TerminalPasswordParser();
  for (const chunk of chunks) parser.feed(chunk);
  return parser;
}

describe("interactive password input", () => {
  it("supports ordinary character-by-character manual input", () => {
    const parser = parseChunks([...Array.from("Manual-Pass-2026!"), "\r"]);
    expect(parser.completed).toBe(true);
    expect(parser.cancelled).toBe(false);
    expect(parser.value).toBe("Manual-Pass-2026!");
  });

  it("strips split bracketed-paste control sequences", () => {
    const parser = parseChunks([
      "\u001b",
      "[200",
      "~Pasted-Password-2026!",
      "\u001b[2",
      "01~",
      "\r",
    ]);
    expect(parser.value).toBe("Pasted-Password-2026!");
    expect(parser.completed).toBe(true);
  });

  it("preserves deliberate leading and trailing spaces without trimming", () => {
    const parser = parseChunks([
      "\u001b[200~  spaces stay  \u001b[201~\r",
    ]);
    expect(parser.value).toBe("  spaces stay  ");
  });

  it("preserves punctuation, Unicode, and emoji", () => {
    const special = "A@b# $%^&*()_+-=[]{}中文🙂";
    const parser = parseChunks([special, "\r"]);
    expect(parser.value).toBe(special);
  });

  it("detects a mismatch while allowing exact repeated values", () => {
    expect(passwordsMatch("same password", "same password")).toBe(true);
    expect(passwordsMatch("same password", "same password ")).toBe(false);
    expect(passwordsMatch("same password", "Same password")).toBe(false);
  });

  it("ignores unrelated terminal escape sequences", () => {
    const parser = parseChunks(["abc", "\u001b[A", "def", "\r"]);
    expect(parser.value).toBe("abcdef");
  });
});

describe("offline password verification", () => {
  it("uses the same hash and verification implementation", async () => {
    const password = "  Verify-Special-密碼!🙂  ";
    const hash = await hashPassword(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("Verify-Special-密碼!🙂", hash)).resolves.toBe(false);
    await expect(
      verifyPasswordFromEnvironment({ AUTH_PASSWORD_HASH: hash }, password),
    ).resolves.toBe(true);
    await expect(
      verifyPasswordFromEnvironment(
        { AUTH_PASSWORD_HASH: hash },
        "wrong-password",
      ),
    ).resolves.toBe(false);
  });

  it("reports missing or invalid environment hashes as failures", async () => {
    await expect(
      verifyPasswordFromEnvironment({}, "valid-password-value"),
    ).rejects.toThrow("AUTH_PASSWORD_HASH_MISSING");
    await expect(
      verifyPasswordFromEnvironment(
        { AUTH_PASSWORD_HASH: "not-a-valid-hash" },
        "valid-password-value",
      ),
    ).rejects.toThrow("AUTH_PASSWORD_HASH_INVALID");
  });

  it("does not import SQLite, Express, login sessions, or GitHub", () => {
    const files = [
      "src/server/auth/cli/verify-password.ts",
      "src/server/auth/cli/operations.ts",
      "src/server/auth/password.ts",
    ];
    const source = files
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(
      /better-sqlite3|drizzle|express|auth_sessions|github-content/i,
    );
  });
});
