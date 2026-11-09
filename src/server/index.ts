import path from "node:path";
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";
import {
  defaultLearningRecord,
  getDashboard,
  getLesson,
  getProgress,
  listLessons,
  markLessonRead,
  submitQuiz,
  updateLearningRecord,
} from "./services/learning";
import { closeDatabase, initializeDatabase, pingDatabase } from "./db/init";
import { sqlite } from "./db";
import { createAuthRouter } from "./auth/routes";
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireCsrf,
  type AuthLocals,
} from "./auth/middleware";
import { createContentRouter } from "./content/routes";
import { routeParam } from "./lib/http";
import { getAuthConfig } from "./auth/config";

initializeDatabase();

const app = express();
app.locals.database = sqlite;
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const requireAuth = createAuthMiddleware();
const optionalAuth = createOptionalAuthMiddleware();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  if (isProduction) {
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
});

app.use("/api/auth", createAuthRouter(sqlite));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: pingDatabase(),
    phase: "Phase 2",
    ai: "demo-only",
    authConfigured: getAuthConfig().configured,
    githubSyncEnabled: process.env.GITHUB_SYNC_ENABLED === "true",
  });
});

app.get("/api/dashboard", optionalAuth, (_request, response) => {
  const dashboard = getDashboard();
  if (!response.locals.authenticatedSession) {
    response.json({
      ...dashboard,
      streak: 0,
      completedCount: 0,
      recent: [],
      todayLesson: {
        ...dashboard.todayLesson,
        record: defaultLearningRecord(dashboard.todayLesson.id),
      },
    });
    return;
  }
  response.json(dashboard);
});

app.get("/api/lessons", optionalAuth, (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q : "";
  const category =
    typeof request.query.category === "string" ? request.query.category : "";
  const lessons = listLessons(query, category);
  response.json({
    lessons: response.locals.authenticatedSession
      ? lessons
      : lessons.map((lesson) => ({
          ...lesson,
          record: defaultLearningRecord(lesson.id),
        })),
    query,
    category,
  });
});

app.get("/api/lessons/:id", optionalAuth, (request, response) => {
  const lesson = getLesson(routeParam(request.params.id));
  if (!lesson) {
    response.status(404).json({ error: "LESSON_NOT_FOUND", message: "找不到這篇教材。" });
    return;
  }
  response.json(
    response.locals.authenticatedSession
      ? lesson
      : { ...lesson, record: defaultLearningRecord(lesson.id) },
  );
});

app.post("/api/lessons/:id/read", requireAuth, requireCsrf, (request, response) => {
  try {
    response.json({ record: markLessonRead(routeParam(request.params.id)) });
  } catch (error) {
    if (error instanceof Error && error.message === "LESSON_NOT_FOUND") {
      response.status(404).json({ error: "LESSON_NOT_FOUND", message: "找不到這篇教材。" });
      return;
    }
    throw error;
  }
});

const recordPatchSchema = z
  .object({
    completed: z.boolean().optional(),
    bookmarked: z.boolean().optional(),
  })
  .refine((value) => value.completed !== undefined || value.bookmarked !== undefined, {
    message: "至少要提供 completed 或 bookmarked。",
  });

app.patch(
  "/api/lessons/:id/record",
  requireAuth,
  requireCsrf,
  (request: Request, response: Response<unknown, AuthLocals>) => {
  const parsed = recordPatchSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "INVALID_RECORD_UPDATE",
      message: "學習狀態格式不正確。",
      issues: parsed.error.issues,
    });
    return;
  }

  try {
    response.json({
      record: updateLearningRecord(routeParam(request.params.id), parsed.data),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LESSON_NOT_FOUND") {
      response.status(404).json({ error: "LESSON_NOT_FOUND", message: "找不到這篇教材。" });
      return;
    }
    throw error;
  }
  },
);

const quizSubmissionSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0)),
});

app.post(
  "/api/lessons/:id/quiz-attempts",
  requireAuth,
  requireCsrf,
  (request, response) => {
  const parsed = quizSubmissionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "INVALID_QUIZ_ANSWERS",
      message: "答案格式不正確。",
      issues: parsed.error.issues,
    });
    return;
  }

  try {
      response
        .status(201)
        .json(submitQuiz(routeParam(request.params.id), parsed.data.answers));
  } catch (error) {
    if (error instanceof Error && error.message === "LESSON_NOT_FOUND") {
      response.status(404).json({ error: "LESSON_NOT_FOUND", message: "找不到這篇教材。" });
      return;
    }
    if (error instanceof Error && error.message === "INVALID_QUIZ_ANSWERS") {
      response.status(400).json({
        error: "INVALID_QUIZ_ANSWERS",
        message: "請完成所有題目並選擇有效選項。",
      });
      return;
    }
    throw error;
  }
  },
);

app.get("/api/progress", requireAuth, (_request, response) => {
  response.json(getProgress());
});

app.use(
  "/api/admin/lessons",
  createContentRouter({
    database: sqlite,
    githubSyncEnabled: process.env.GITHUB_SYNC_ENABLED === "true",
    githubBranch: process.env.GITHUB_BRANCH ?? null,
  }),
);

if (isProduction) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((_request, response) => {
  response.status(404).json({ error: "NOT_FOUND", message: "找不到這個資源。" });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: "INTERNAL_ERROR",
    message: "伺服器暫時無法完成這個操作，請稍後再試。",
  });
};
app.use(errorHandler);

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`CS Daily Knowledge API listening on http://127.0.0.1:${port}`);
});

function shutdown(): void {
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
