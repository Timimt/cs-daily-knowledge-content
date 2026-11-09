import { isValidPasswordHash } from "./password";

export type AuthConfig =
  | {
      configured: true;
      passwordHash: string;
      sessionSecret: string;
      sessionTtlSeconds: number;
      cookieSecure: boolean;
      cookieName: string;
      csrfCookieName: string;
    }
  | {
      configured: false;
      reason: string;
      missing: string[];
    };

export function getAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const missing: string[] = [];
  const passwordHash = env.AUTH_PASSWORD_HASH?.trim() ?? "";
  const sessionSecret = env.AUTH_SESSION_SECRET?.trim() ?? "";
  if (!passwordHash) missing.push("AUTH_PASSWORD_HASH");
  if (!sessionSecret) missing.push("AUTH_SESSION_SECRET");
  if (missing.length > 0) {
    return {
      configured: false,
      reason: "Authentication environment variables are not configured.",
      missing,
    };
  }
  if (!isValidPasswordHash(passwordHash)) {
    return {
      configured: false,
      reason: "AUTH_PASSWORD_HASH is not a supported scrypt hash.",
      missing: [],
    };
  }
  if (Buffer.byteLength(sessionSecret, "utf8") < 32) {
    return {
      configured: false,
      reason: "AUTH_SESSION_SECRET must be at least 32 bytes.",
      missing: [],
    };
  }

  const hours = Number(env.AUTH_SESSION_TTL_HOURS ?? "168");
  const sessionTtlSeconds =
    Number.isFinite(hours) && hours >= 1 && hours <= 720
      ? Math.floor(hours * 3600)
      : 7 * 24 * 3600;
  const secureValue = env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  const cookieSecure =
    secureValue === "true"
      ? true
      : secureValue === "false"
        ? false
        : env.NODE_ENV === "production";

  return {
    configured: true,
    passwordHash,
    sessionSecret,
    sessionTtlSeconds,
    cookieSecure,
    cookieName: "cs_daily_session",
    csrfCookieName: "cs_daily_csrf",
  };
}
