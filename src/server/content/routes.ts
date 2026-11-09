import { Router, type NextFunction, type Request, type Response } from "express";
import type DatabaseType from "better-sqlite3";
import { z } from "zod";
import type { AuthLocals } from "../auth/middleware";
import { createAuthMiddleware, requireCsrf } from "../auth/middleware";
import {
  GitHubContentService,
  type GitHubFetch,
} from "../services/github-content";
import {
  ContentManagementError,
  ContentManagementService,
  type GitHubContentClient,
} from "./management-service";
import { EDITOR_CATEGORIES } from "../../shared/admin-types";
import {
  FileGitHubSyncRecoveryStore,
  type GitHubSyncRecoveryStore,
} from "./sync-recovery";
import { routeParam } from "../lib/http";

const editorFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum(EDITOR_CATEGORIES),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().trim().min(1).max(500),
  markdown: z.string().min(1).max(600_000),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  images: z.array(z.unknown()).max(20).optional(),
  references: z.array(z.unknown()).max(50).optional(),
  relatedTopics: z.array(z.string().max(100)).max(30).optional(),
  tags: z.array(z.string().max(100)).max(30).optional(),
});

const createSchema = editorFieldsSchema.extend({
  lessonId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/).optional(),
  day: z.number().int().min(1).max(100000).optional(),
});

const updateSchema = editorFieldsSchema.extend({
  expectedVersionNumber: z.number().int().positive(),
});

const expectedVersionSchema = z.object({
  expectedVersionNumber: z.number().int().positive(),
});

const requireAuth = createAuthMiddleware();

export type ContentRouterOptions = {
  database: DatabaseType.Database;
  githubSyncEnabled?: boolean;
  githubFetch?: GitHubFetch;
  githubContentService?: GitHubContentClient | null;
  recoveryStore?: GitHubSyncRecoveryStore;
  githubBranch?: string | null;
};

function createGitHubClient(
  options: ContentRouterOptions,
): GitHubContentClient | null {
  if (options.githubContentService !== undefined) {
    return options.githubContentService;
  }
  if (!options.githubSyncEnabled) return null;
  try {
    return GitHubContentService.fromEnv(process.env, options.githubFetch);
  } catch {
    return null;
  }
}

export function createContentRouter(options: ContentRouterOptions): Router {
  const router = Router();
  const github = createGitHubClient(options);
  const service = new ContentManagementService(
    options.database,
    github,
    options.recoveryStore ?? new FileGitHubSyncRecoveryStore(),
    options.githubBranch ?? process.env.GITHUB_BRANCH ?? null,
  );

  router.use(requireAuth);

  router.get("/", (_request, response) => {
    response.json({ lessons: service.listLessons() });
  });

  router.get("/:id", (request, response) => {
    response.json(service.getLesson(routeParam(request.params.id)));
  });

  router.post(
    "/",
    requireCsrf,
    (request: Request, response: Response<unknown, AuthLocals>) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          error: "INVALID_LESSON",
          message: "教材欄位驗證失敗。",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
      response.status(201).json({
        lesson: service.createDraft(parsed.data),
      });
    },
  );

  router.patch(
    "/:id",
    requireCsrf,
    (request: Request, response: Response<unknown, AuthLocals>) => {
      const parsed = updateSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          error: "INVALID_LESSON",
          message: "教材欄位驗證失敗。",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
      const { expectedVersionNumber, ...input } = parsed.data;
      response.json({
        lesson: service.updateDraft(
          routeParam(request.params.id),
          input,
          expectedVersionNumber,
        ),
      });
    },
  );

  router.post("/:id/publish", requireCsrf, (request, response) => {
    const parsed = expectedVersionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: "INVALID_LESSON",
        message: "發布請求格式不正確。",
      });
      return;
    }
    response.json({
      lesson: service.publishLesson(
        routeParam(request.params.id),
        parsed.data.expectedVersionNumber,
      ),
    });
  });

  router.post("/:id/archive", requireCsrf, (request, response) => {
    response.json({
      lesson: service.archiveLesson(routeParam(request.params.id)),
    });
  });

  router.post("/:id/sync", requireCsrf, async (request, response) => {
    const id = routeParam(request.params.id);
    const job = await service.syncLesson(id);
    response.json({ job, lesson: service.getLesson(id) });
  });

  router.get("/:id/sync-jobs", (request, response) => {
    response.json({ jobs: service.getSyncJobs(routeParam(request.params.id)) });
  });

  router.get("/:id/versions/:versionNumber", (request, response) => {
    const versionNumber = Number(routeParam(request.params.versionNumber));
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      response.status(400).json({
        error: "INVALID_VERSION",
        message: "教材版本格式不正確。",
      });
      return;
    }
    response.json({
      version: service.getVersion(routeParam(request.params.id), versionNumber),
    });
  });

  router.get("/:id/github-history", async (request, response) => {
    const limit = Math.min(Math.max(Number(request.query.limit ?? 30), 1), 100);
    response.json({
      history: await service.getGitHubHistory(
        routeParam(request.params.id),
        Number.isFinite(limit) ? limit : 30,
      ),
    });
  });

  router.get("/:id/github-version/:commitSha", async (request, response) => {
    response.json({
      version: await service.getGitHubVersion(
        routeParam(request.params.id),
        routeParam(request.params.commitSha),
      ),
    });
  });

  router.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (error instanceof ContentManagementError) {
        response.status(error.status).json({
          error: error.code,
          message: error.message,
        });
        return;
      }
      next(error);
    },
  );

  return router;
}
