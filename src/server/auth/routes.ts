import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type DatabaseType from "better-sqlite3";
import { getAuthConfig } from "./config";
import { parseCookies, serializeCookie } from "./cookies";
import { createAuthMiddleware, requireCsrf, type AuthLocals } from "./middleware";
import { verifyPassword } from "./password";
import { SessionService } from "./session-service";

const loginSchema = z.object({
  password: z.string().min(1).max(1024),
});

const requireAuth = createAuthMiddleware();

function noStore(_request: Request, response: Response, next: () => void) {
  response.setHeader("Cache-Control", "no-store");
  next();
}

function clientIdentifier(request: Request): string {
  return request.ip || request.socket.remoteAddress || "unknown";
}

function clearAuthCookies(
  response: Response,
  secure: boolean,
  sessionCookieName: string,
  csrfCookieName: string,
) {
  response.append(
    "Set-Cookie",
    serializeCookie(sessionCookieName, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure,
    }),
  );
  response.append(
    "Set-Cookie",
    serializeCookie(csrfCookieName, "", {
      maxAgeSeconds: 0,
      httpOnly: false,
      secure,
    }),
  );
}

export function createAuthRouter(database: DatabaseType.Database): Router {
  const router = Router();

  router.use(noStore);

  router.post("/login", async (request, response) => {
    const config = getAuthConfig();
    if (!config.configured) {
      response.status(503).json({
        error: "AUTH_NOT_CONFIGURED",
        message: "登入功能尚未設定。",
        required: config.missing,
      });
      return;
    }

    const sessions = new SessionService(database, config);
    const clientHash = sessions.hashClient(clientIdentifier(request));
    const blockedUntil = sessions.getLoginBlock(clientHash);
    if (blockedUntil) {
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((new Date(blockedUntil).getTime() - Date.now()) / 1000))),
      );
      response.status(429).json({
        error: "LOGIN_RATE_LIMITED",
        message: "登入嘗試次數過多，請稍後再試。",
        retryAt: blockedUntil,
      });
      return;
    }

    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: "INVALID_LOGIN_REQUEST",
        message: "登入資料格式不正確。",
      });
      return;
    }

    const valid = await verifyPassword(
      parsed.data.password,
      config.passwordHash,
    );
    if (!valid) {
      const newBlockedUntil = sessions.recordLoginFailure(clientHash);
      if (newBlockedUntil) {
        response.setHeader(
          "Retry-After",
          String(
            Math.max(
              1,
              Math.ceil(
                (new Date(newBlockedUntil).getTime() - Date.now()) / 1000,
              ),
            ),
          ),
        );
        response.status(429).json({
          error: "LOGIN_RATE_LIMITED",
          message: "登入嘗試次數過多，請稍後再試。",
          retryAt: newBlockedUntil,
        });
        return;
      }
      response.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "密碼不正確。",
      });
      return;
    }

    sessions.clearLoginFailures(clientHash);
    sessions.cleanupExpiredSessions();
    const tokens = sessions.createSession(request.headers["user-agent"]);
    response.append(
      "Set-Cookie",
      serializeCookie(config.cookieName, tokens.sessionToken, {
        maxAgeSeconds: config.sessionTtlSeconds,
        httpOnly: true,
        secure: config.cookieSecure,
      }),
    );
    response.append(
      "Set-Cookie",
      serializeCookie(config.csrfCookieName, tokens.csrfToken, {
        maxAgeSeconds: config.sessionTtlSeconds,
        httpOnly: false,
        secure: config.cookieSecure,
      }),
    );
    response.json({
      authenticated: true,
      expiresAt: tokens.expiresAt,
    });
  });

  router.get("/session", (request, response) => {
    const config = getAuthConfig();
    if (!config.configured) {
      response.json({
        configured: false,
        authenticated: false,
        required: config.missing,
        message: config.reason,
      });
      return;
    }
    const sessions = new SessionService(database, config);
    const cookies = parseCookies(request.headers.cookie);
    const session = sessions.authenticate(cookies[config.cookieName]);
    response.json({
      configured: true,
      authenticated: Boolean(session),
      expiresAt: session?.expiresAt ?? null,
    });
  });

  router.post(
    "/logout",
    requireAuth,
    requireCsrf,
    (request, response: Response<unknown, AuthLocals>) => {
      const session = response.locals.authenticatedSession;
      const sessions = response.locals.sessionService;
      const config = response.locals.authConfig;
      if (session && sessions && config) {
        sessions.logout(session.sessionHash);
        clearAuthCookies(
          response,
          config.cookieSecure,
          config.cookieName,
          config.csrfCookieName,
        );
      }
      response.json({ authenticated: false });
    },
  );

  return router;
}
