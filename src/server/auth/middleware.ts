import type { NextFunction, Request, Response } from "express";
import { parseCookies } from "./cookies";
import { getAuthConfig, type AuthConfig } from "./config";
import {
  SessionService,
  type AuthenticatedSession,
} from "./session-service";

export type AuthLocals = {
  authSessionHash?: string;
  authExpiresAt?: string;
  sessionService?: SessionService;
  authConfig?: Extract<AuthConfig, { configured: true }>;
  authenticatedSession?: AuthenticatedSession;
};

function attachSession(required: boolean) {
  return function auth(
    request: Request,
    response: Response<unknown, AuthLocals>,
    next: NextFunction,
  ) {
    const config = getAuthConfig();
    if (!config.configured) {
      if (!required) {
        next();
        return;
      }
      response.status(503).json({
        error: "AUTH_NOT_CONFIGURED",
        message: "登入功能尚未設定。",
        required: config.missing,
      });
      return;
    }
    const database = request.app.locals.database as import("better-sqlite3").Database;
    const sessions = new SessionService(database, config);
    const cookies = parseCookies(request.headers.cookie);
    const session = sessions.authenticate(cookies[config.cookieName]);
    if (!session) {
      if (!required) {
        next();
        return;
      }
      response.status(401).json({
        error: "UNAUTHENTICATED",
        message: "請先登入。",
      });
      return;
    }
    response.locals.authSessionHash = session.sessionHash;
    response.locals.authExpiresAt = session.expiresAt;
    response.locals.sessionService = sessions;
    response.locals.authConfig = config;
    response.locals.authenticatedSession = session;
    next();
  };
}

export function createAuthMiddleware() {
  return attachSession(true);
}

export function createOptionalAuthMiddleware() {
  return attachSession(false);
}

export function requireCsrf(
  request: Request,
  response: Response<unknown, AuthLocals>,
  next: NextFunction,
) {
  const config = getAuthConfig();
  const session = response.locals.authenticatedSession;
  const sessions = response.locals.sessionService as SessionService | undefined;
  if (!config.configured || !session || !sessions) {
    response.status(401).json({
      error: "UNAUTHENTICATED",
      message: "請先登入。",
    });
    return;
  }
  const cookies = parseCookies(request.headers.cookie);
  const headerToken =
    typeof request.headers["x-csrf-token"] === "string"
      ? request.headers["x-csrf-token"]
      : undefined;
  const cookieToken = cookies[config.csrfCookieName];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    response.status(403).json({
      error: "CSRF_VALIDATION_FAILED",
      message: "CSRF 驗證失敗，請重新整理後再試。",
    });
    return;
  }
  if (!sessions.verifyCsrf(session, headerToken)) {
    response.status(403).json({
      error: "CSRF_VALIDATION_FAILED",
      message: "CSRF 驗證失敗，請重新整理後再試。",
    });
    return;
  }
  next();
}
