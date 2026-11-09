import crypto from "node:crypto";
import type DatabaseType from "better-sqlite3";
import type { AuthConfig } from "./config";

const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_BLOCK_SECONDS = 15 * 60;
const LOGIN_MAX_FAILURES = 5;

export type SessionTokens = {
  sessionToken: string;
  csrfToken: string;
  expiresAt: string;
};

export type AuthenticatedSession = {
  sessionHash: string;
  csrfHash: string;
  expiresAt: string;
};

function secretHash(secret: string, purpose: string, value: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${value}`, "utf8")
    .digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export class SessionService {
  constructor(
    private readonly database: DatabaseType.Database,
    private readonly config: Extract<AuthConfig, { configured: true }>,
  ) {}

  createSession(userAgent: string | undefined): SessionTokens {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.sessionTtlSeconds * 1000,
    ).toISOString();
    const sessionToken = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(32).toString("base64url");
    const sessionHash = secretHash(
      this.config.sessionSecret,
      "session",
      sessionToken,
    );
    const csrfHash = secretHash(
      this.config.sessionSecret,
      "csrf",
      csrfToken,
    );
    this.database
      .prepare(
        `INSERT INTO auth_sessions
         (session_hash, csrf_hash, created_at, expires_at, last_seen_at, user_agent_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        sessionHash,
        csrfHash,
        now.toISOString(),
        expiresAt,
        now.toISOString(),
        userAgent
          ? secretHash(this.config.sessionSecret, "ua", userAgent.slice(0, 512))
          : null,
      );
    return { sessionToken, csrfToken, expiresAt };
  }

  cleanupExpiredSessions(): void {
    this.database
      .prepare("DELETE FROM auth_sessions WHERE expires_at <= ?")
      .run(new Date().toISOString());
  }

  authenticate(sessionToken: string | undefined): AuthenticatedSession | null {
    if (!sessionToken) return null;
    const sessionHash = secretHash(
      this.config.sessionSecret,
      "session",
      sessionToken,
    );
    const row = this.database
      .prepare(
        "SELECT * FROM auth_sessions WHERE session_hash = ?",
      )
      .get(sessionHash) as
      | {
          session_hash: string;
          csrf_hash: string;
          expires_at: string;
          last_seen_at: string;
        }
      | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      this.database
        .prepare("DELETE FROM auth_sessions WHERE session_hash = ?")
        .run(sessionHash);
      return null;
    }
    const lastSeen = new Date(row.last_seen_at).getTime();
    if (Date.now() - lastSeen > 5 * 60 * 1000) {
      this.database
        .prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE session_hash = ?")
        .run(new Date().toISOString(), sessionHash);
    }
    return {
      sessionHash,
      csrfHash: row.csrf_hash,
      expiresAt: row.expires_at,
    };
  }

  verifyCsrf(
    session: AuthenticatedSession,
    csrfToken: string | undefined,
  ): boolean {
    if (!csrfToken) return false;
    const candidate = secretHash(this.config.sessionSecret, "csrf", csrfToken);
    return safeEqual(candidate, session.csrfHash);
  }

  hashClient(clientIdentifier: string): string {
    return secretHash(
      this.config.sessionSecret,
      "client",
      clientIdentifier.slice(0, 256),
    );
  }

  logout(sessionHash: string): void {
    this.database
      .prepare("DELETE FROM auth_sessions WHERE session_hash = ?")
      .run(sessionHash);
  }

  getLoginBlock(clientHash: string): string | null {
    const row = this.database
      .prepare(
        "SELECT blocked_until FROM auth_login_attempts WHERE client_hash = ?",
      )
      .get(clientHash) as { blocked_until: string | null } | undefined;
    if (!row?.blocked_until) return null;
    return new Date(row.blocked_until).getTime() > Date.now()
      ? row.blocked_until
      : null;
  }

  recordLoginFailure(clientHash: string): string | null {
    const now = new Date();
    const existing = this.database
      .prepare("SELECT * FROM auth_login_attempts WHERE client_hash = ?")
      .get(clientHash) as
      | {
          failure_count: number;
          window_started_at: string;
          blocked_until: string | null;
        }
      | undefined;
    const windowStart = existing
      ? new Date(existing.window_started_at).getTime()
      : now.getTime();
    const withinWindow =
      now.getTime() - windowStart <= LOGIN_WINDOW_SECONDS * 1000;
    const failures = withinWindow ? (existing?.failure_count ?? 0) + 1 : 1;
    const blockedUntil =
      failures >= LOGIN_MAX_FAILURES
        ? new Date(now.getTime() + LOGIN_BLOCK_SECONDS * 1000).toISOString()
        : null;
    this.database
      .prepare(
        `INSERT INTO auth_login_attempts
         (client_hash, failure_count, window_started_at, blocked_until, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(client_hash) DO UPDATE SET
           failure_count = excluded.failure_count,
           window_started_at = excluded.window_started_at,
           blocked_until = excluded.blocked_until,
           updated_at = excluded.updated_at`,
      )
      .run(
        clientHash,
        failures,
        withinWindow
          ? existing?.window_started_at ?? now.toISOString()
          : now.toISOString(),
        blockedUntil,
        now.toISOString(),
      );
    return blockedUntil;
  }

  clearLoginFailures(clientHash: string): void {
    this.database
      .prepare("DELETE FROM auth_login_attempts WHERE client_hash = ?")
      .run(clientHash);
  }
}
