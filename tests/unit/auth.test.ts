import http from "node:http";
import express from "express";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuthRouter } from "../../src/server/auth/routes";
import { createContentRouter } from "../../src/server/content/routes";
import { createAuthMiddleware } from "../../src/server/auth/middleware";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";
import { parseCookies } from "../../src/server/auth/cookies";
import { getAuthConfig } from "../../src/server/auth/config";
import { SessionService } from "../../src/server/auth/session-service";
import { createLegacyTestDatabase, type TestDatabase } from "./helpers/test-db";

let fixture: TestDatabase;
let server: http.Server;
let baseUrl: string;
let passwordHash: string;
const password = "Correct-Horse-Battery-Staple-2026";
const originalEnv = {
  AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH,
  AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
  AUTH_SESSION_TTL_HOURS: process.env.AUTH_SESSION_TTL_HOURS,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  NODE_ENV: process.env.NODE_ENV,
};

beforeAll(async () => {
  passwordHash = await hashPassword(password);
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  fixture?.cleanup();
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function configureAuth() {
  process.env.AUTH_PASSWORD_HASH = passwordHash;
  process.env.AUTH_SESSION_SECRET = "test-session-secret-with-at-least-32-bytes";
  process.env.AUTH_SESSION_TTL_HOURS = "1";
  process.env.AUTH_COOKIE_SECURE = "false";
  process.env.NODE_ENV = "test";
}

async function startTestServer() {
  fixture = createLegacyTestDatabase();
  await configureAuth();
  const app = express();
  app.use(express.json());
  app.locals.database = fixture.database;
  app.use("/api/auth", createAuthRouter(fixture.database));
  app.use(
    "/api/admin/lessons",
    createContentRouter({
      database: fixture.database,
      githubContentService: null,
    }),
  );
  app.get("/api/protected", createAuthMiddleware(), (_request, response) => {
    response.json({ ok: true });
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  baseUrl = `http://127.0.0.1:${address.port}`;
}

function setCookies(response: Response): string[] {
  const getSetCookie = (response.headers as Headers & {
    getSetCookie?: () => string[];
  }).getSetCookie;
  if (getSetCookie) return getSetCookie.call(response.headers);
  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  expect(response.status).toBe(200);
  const cookies = setCookies(response);
  const pairs = cookies.map((cookie) => cookie.split(";", 1)[0]);
  const cookieHeader = pairs.join("; ");
  const csrfToken = parseCookies(cookieHeader).cs_daily_csrf;
  return { response, cookies, cookieHeader, csrfToken };
}

const lessonBody = {
  title: "Session 測試教材",
  category: "資訊安全與密碼學",
  lessonDate: "2026-11-10",
  summary: "測試受保護管理 API。",
  markdown: "# Session test\n\nProtected content.",
  estimatedMinutes: 5,
  images: [],
  references: [],
  relatedTopics: [],
  tags: ["auth"],
};

describe("single-user authentication and CSRF", () => {
  it("hashes passwords with scrypt and verifies the correct password", async () => {
    expect(passwordHash).toMatch(/^scrypt\$/);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password-value", passwordHash)).resolves.toBe(false);
  });

  it("uses a secure cookie in production and expires stored sessions", async () => {
    fixture = createLegacyTestDatabase();
    await configureAuth();
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecure = process.env.AUTH_COOKIE_SECURE;
    delete process.env.AUTH_COOKIE_SECURE;
    process.env.NODE_ENV = "production";
    try {
      const config = getAuthConfig();
      expect(config.configured).toBe(true);
      if (!config.configured) throw new Error("Expected configured auth");
      expect(config.cookieSecure).toBe(true);

      const sessions = new SessionService(fixture.database, config);
      const tokens = sessions.createSession("vitest");
      expect(
        sessions.authenticate(tokens.sessionToken)?.expiresAt,
      ).toBe(tokens.expiresAt);
      fixture.database
        .prepare("UPDATE auth_sessions SET expires_at = ?")
        .run("2000-01-01T00:00:00.000Z");
      expect(sessions.authenticate(tokens.sessionToken)).toBeNull();
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousSecure === undefined) delete process.env.AUTH_COOKIE_SECURE;
      else process.env.AUTH_COOKIE_SECURE = previousSecure;
    }
  });

  it("logs in with HttpOnly session cookie and enforces CSRF", async () => {
    await startTestServer();
    const loggedIn = await login();
    expect(
      loggedIn.cookies.find((cookie) => cookie.startsWith("cs_daily_session=")),
    ).toContain("HttpOnly");
    expect(loggedIn.cookies.join(";")).toContain("SameSite=Strict");

    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: loggedIn.cookieHeader },
    });
    await expect(sessionResponse.json()).resolves.toMatchObject({
      configured: true,
      authenticated: true,
    });

    const withoutCsrf = await fetch(`${baseUrl}/api/admin/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loggedIn.cookieHeader,
      },
      body: JSON.stringify(lessonBody),
    });
    expect(withoutCsrf.status).toBe(403);

    const wrongCsrf = await fetch(`${baseUrl}/api/admin/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loggedIn.cookieHeader,
        "X-CSRF-Token": "wrong-token",
      },
      body: JSON.stringify(lessonBody),
    });
    expect(wrongCsrf.status).toBe(403);

    const created = await fetch(`${baseUrl}/api/admin/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: loggedIn.cookieHeader,
        "X-CSRF-Token": loggedIn.csrfToken,
      },
      body: JSON.stringify(lessonBody),
    });
    expect(created.status, await created.clone().text()).toBe(201);

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: loggedIn.cookieHeader,
        "X-CSRF-Token": loggedIn.csrfToken,
      },
    });
    expect(logout.status).toBe(200);
    const afterLogout = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: loggedIn.cookieHeader },
    });
    await expect(afterLogout.json()).resolves.toMatchObject({
      configured: true,
      authenticated: false,
    });
  });

  it("blocks protected APIs without a session", async () => {
    await startTestServer();
    const protectedResponse = await fetch(`${baseUrl}/api/protected`);
    expect(protectedResponse.status).toBe(401);
    const adminResponse = await fetch(`${baseUrl}/api/admin/lessons`);
    expect(adminResponse.status).toBe(401);
  });

  it("rate-limits repeated failed logins", async () => {
    await startTestServer();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong-password" }),
      });
      expect([401, 429]).toContain(response.status);
    }
    const blocked = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("reports missing auth configuration without using a weak default", async () => {
    fixture = createLegacyTestDatabase();
    delete process.env.AUTH_PASSWORD_HASH;
    delete process.env.AUTH_SESSION_SECRET;
    const app = express();
    app.use(express.json());
    app.locals.database = fixture.database;
    app.use("/api/auth", createAuthRouter(fixture.database));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    baseUrl = `http://127.0.0.1:${address.port}`;

    const session = await fetch(`${baseUrl}/api/auth/session`);
    const sessionBody = await session.json();
    expect(sessionBody).toMatchObject({
      configured: false,
      authenticated: false,
      required: ["AUTH_PASSWORD_HASH", "AUTH_SESSION_SECRET"],
    });
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "anything-with-enough-length" }),
    });
    expect(loginResponse.status).toBe(503);
  });
});
