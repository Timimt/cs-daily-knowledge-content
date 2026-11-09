import crypto from "node:crypto";
import type DatabaseType from "better-sqlite3";
import type {
  GitHubLessonDocument,
  GitHubLessonFile,
  GitHubLessonHistoryEntry,
} from "../services/github-content";
import {
  GitHubShaConflictError,
  GitHubContentError,
} from "../services/github-content";
import type {
  GitHubSyncJobView,
  LessonEditorInput,
  ManagedLessonDetail,
  ManagedLessonSummary,
  ManagedLessonVersion,
  PublicationStatus,
} from "../../shared/admin-types";
import { EDITOR_CATEGORIES as CATEGORIES } from "../../shared/admin-types";
import type {
  GitHubSyncRecoveryStore,
  GitHubSyncRecoveryRecord,
} from "./sync-recovery";

export type GitHubContentClient = {
  createLesson(input: {
    lessonId: string;
    category: string;
    title: string;
    markdown: string;
  }): Promise<GitHubLessonFile>;
  getLesson(locator: { path?: string; lessonId?: string }): Promise<GitHubLessonDocument>;
  updateLesson(input: {
    path?: string;
    title: string;
    markdown: string;
    expectedSha?: string;
  }): Promise<GitHubLessonFile>;
  getLessonHistory(
    locator: { path?: string; lessonId?: string },
    limit?: number,
  ): Promise<GitHubLessonHistoryEntry[]>;
  getLessonVersion(
    locator: { path?: string; lessonId?: string },
    commitSha: string,
  ): Promise<GitHubLessonDocument & { commitSha: string }>;
};

export type ContentManagementErrorCode =
  | "LESSON_NOT_FOUND"
  | "LESSON_ALREADY_EXISTS"
  | "INVALID_LESSON"
  | "INVALID_STATUS_TRANSITION"
  | "VERSION_CONFLICT"
  | "GITHUB_SYNC_DISABLED"
  | "GITHUB_SYNC_IN_PROGRESS"
  | "GITHUB_SYNC_CONFLICT"
  | "GITHUB_SYNC_FAILED"
  | "GITHUB_SYNC_PERSISTENCE_FAILED"
  | "GITHUB_NOT_FOUND";

export class ContentManagementError extends Error {
  readonly code: ContentManagementErrorCode;
  readonly status: number;

  constructor(code: ContentManagementErrorCode, message: string, status = 400) {
    super(message);
    this.name = "ContentManagementError";
    this.code = code;
    this.status = status;
  }
}

type LessonRow = {
  id: string;
  day: number;
  title: string;
  category: string;
  lesson_date: string;
  summary: string;
  content: string;
  images_json: string;
  references_json: string;
  related_topics_json: string;
  tags_json: string;
  estimated_minutes: number;
  created_at: string;
  updated_at: string;
  github_path: string | null;
  github_branch: string | null;
  github_blob_sha: string | null;
  github_commit_sha: string | null;
  github_sync_status: string;
  github_last_synced_at: string | null;
  publication_status: string;
  published_at: string | null;
  archived_at: string | null;
  published_version_id: number | null;
  current_version_number: number;
  content_hash: string;
};

type VersionRow = {
  id: number;
  lesson_id: string;
  version_number: number;
  title: string;
  category: string;
  lesson_date: string;
  summary: string;
  markdown: string;
  images_json: string;
  references_json: string;
  related_topics_json: string;
  tags_json: string;
  estimated_minutes: number;
  content_hash: string;
  version_status: string;
  github_path: string | null;
  github_branch: string | null;
  github_blob_sha: string | null;
  github_commit_sha: string | null;
  github_sync_status: string;
  synced_at: string | null;
  published_at: string | null;
  created_at: string;
};

type SyncJobRow = {
  id: number;
  lesson_id: string;
  version_id: number;
  operation: string;
  idempotency_key: string;
  status: string;
  attempt_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  next_attempt_at: string | null;
  expected_blob_sha: string | null;
  github_path: string | null;
  github_blob_sha: string | null;
  github_commit_sha: string | null;
  recovery_json: string | null;
  created_at: string;
  updated_at: string;
};

const lessonIdPattern = /^[a-z0-9][a-z0-9-]{1,63}$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MARKDOWN_BYTES = 512 * 1024;

function parseArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeError(error: unknown): { code: string; message: string } {
  if (error instanceof GitHubContentError) {
    return {
      code: error.code,
      message: error.message.slice(0, 500),
    };
  }
  return {
    code: "GITHUB_SYNC_FAILED",
    message: "GitHub synchronization failed.",
  };
}

function publicationStatus(value: string): PublicationStatus {
  if (value === "published" || value === "archived" || value === "draft") {
    return value;
  }
  return "draft";
}

function contentHash(
  input: Pick<
    LessonEditorInput,
    | "title"
    | "category"
    | "lessonDate"
    | "summary"
    | "markdown"
    | "estimatedMinutes"
    | "images"
    | "references"
    | "relatedTopics"
    | "tags"
  >,
): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: input.title,
        category: input.category,
        lessonDate: input.lessonDate,
        summary: input.summary,
        markdown: input.markdown,
        estimatedMinutes: input.estimatedMinutes,
        images: input.images ?? [],
        references: input.references ?? [],
        relatedTopics: input.relatedTopics ?? [],
        tags: input.tags ?? [],
      }),
      "utf8",
    )
    .digest("hex");
}

function validateEditorInput(input: LessonEditorInput): LessonEditorInput & {
  estimatedMinutes: number;
  images: unknown[];
  references: unknown[];
  relatedTopics: string[];
  tags: string[];
} {
  const title = input.title.trim();
  const category = input.category.trim();
  const lessonDate = input.lessonDate.trim();
  const summary = input.summary.trim();
  const markdown = input.markdown;
  if (!title || title.length > 160) {
    throw new ContentManagementError("INVALID_LESSON", "教材標題無效。");
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    throw new ContentManagementError("INVALID_LESSON", "教材分類不在允許清單。");
  }
  if (!isoDatePattern.test(lessonDate)) {
    throw new ContentManagementError("INVALID_LESSON", "教材日期格式必須是 YYYY-MM-DD。");
  }
  if (!summary || summary.length > 500) {
    throw new ContentManagementError("INVALID_LESSON", "教材摘要為必填且不得超過 500 字。");
  }
  if (!markdown.trim()) {
    throw new ContentManagementError("INVALID_LESSON", "教材 Markdown 不可為空。");
  }
  if (Buffer.byteLength(markdown, "utf8") > MAX_MARKDOWN_BYTES) {
    throw new ContentManagementError("INVALID_LESSON", "教材 Markdown 超過 512 KiB。");
  }
  const estimatedMinutes = input.estimatedMinutes ?? 8;
  if (
    !Number.isInteger(estimatedMinutes) ||
    estimatedMinutes < 1 ||
    estimatedMinutes > 600
  ) {
    throw new ContentManagementError("INVALID_LESSON", "預估閱讀時間無效。");
  }
  const relatedTopics = (input.relatedTopics ?? []).map((value) => value.trim()).filter(Boolean);
  const tags = (input.tags ?? []).map((value) => value.trim()).filter(Boolean);
  if (
    relatedTopics.length > 30 ||
    tags.length > 30 ||
    (input.images?.length ?? 0) > 20 ||
    (input.references?.length ?? 0) > 50
  ) {
    throw new ContentManagementError("INVALID_LESSON", "教材 metadata 數量超過限制。");
  }
  return {
    ...input,
    title,
    category,
    lessonDate,
    summary,
    markdown,
    estimatedMinutes,
    images: input.images ?? [],
    references: input.references ?? [],
    relatedTopics,
    tags,
  };
}

function lessonIdForDay(day: number): string {
  return `day-${String(day).padStart(3, "0")}`;
}

function syncJobView(row: SyncJobRow): GitHubSyncJobView {
  return {
    id: row.id,
    versionId: row.version_id,
    operation: row.operation === "update" ? "update" : "create",
    status:
      row.status === "in_progress" ||
      row.status === "synced" ||
      row.status === "failed" ||
      row.status === "conflict" ||
      row.status === "cancelled"
        ? row.status
        : "pending",
    attemptCount: row.attempt_count,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    nextAttemptAt: row.next_attempt_at,
    githubPath: row.github_path,
    githubBlobSha: row.github_blob_sha,
    githubCommitSha: row.github_commit_sha,
    updatedAt: row.updated_at,
  };
}

export class ContentManagementService {
  constructor(
    private readonly database: DatabaseType.Database,
    private readonly github: GitHubContentClient | null,
    private readonly recoveryStore: GitHubSyncRecoveryStore,
    private readonly githubBranch: string | null = null,
  ) {}

  listLessons(): ManagedLessonSummary[] {
    const rows = this.database
      .prepare(
        `SELECT l.*,
          (SELECT j.last_error_message
             FROM github_sync_jobs j
            WHERE j.lesson_id = l.id
            ORDER BY j.id DESC LIMIT 1) AS latest_sync_error
         FROM lessons l
         ORDER BY l.publication_status = 'archived', l.day DESC`,
      )
      .all() as Array<LessonRow & { latest_sync_error: string | null }>;
    return rows.map((row) => this.toSummary(row, row.latest_sync_error));
  }

  getLesson(id: string): ManagedLessonDetail {
    const row = this.getLessonRow(id);
    const latestJob = this.database
      .prepare(
        "SELECT last_error_message FROM github_sync_jobs WHERE lesson_id = ? ORDER BY id DESC LIMIT 1",
      )
      .get(id) as { last_error_message: string | null } | undefined;
    const versions = this.database
      .prepare(
        "SELECT * FROM lesson_versions WHERE lesson_id = ? ORDER BY version_number DESC",
      )
      .all(id) as VersionRow[];
    return {
      ...this.toSummary(row, latestJob?.last_error_message ?? null),
      markdown: row.content,
      estimatedMinutes: row.estimated_minutes,
      images: parseArray(row.images_json),
      references: parseArray(row.references_json),
      relatedTopics: parseArray<string>(row.related_topics_json),
      tags: parseArray<string>(row.tags_json),
      versions: versions.map((version) => this.toVersion(version, row)),
    };
  }

  createDraft(input: LessonEditorInput): ManagedLessonDetail {
    const validated = validateEditorInput(input);
    const maxDay = (
      this.database.prepare("SELECT COALESCE(MAX(day), 0) AS day FROM lessons").get() as {
        day: number;
      }
    ).day;
    const day = input.day ?? maxDay + 1;
    if (!Number.isInteger(day) || day < 1 || day > 100000) {
      throw new ContentManagementError("INVALID_LESSON", "Day 編號無效。");
    }
    const lessonId = input.lessonId ?? lessonIdForDay(day);
    if (!lessonIdPattern.test(lessonId)) {
      throw new ContentManagementError("INVALID_LESSON", "教材 ID 格式無效。");
    }
    const existing = this.database
      .prepare("SELECT id FROM lessons WHERE id = ? OR day = ?")
      .get(lessonId, day);
    if (existing) {
      throw new ContentManagementError(
        "LESSON_ALREADY_EXISTS",
        "教材 ID 或 Day 已存在。",
        409,
      );
    }

    const now = new Date().toISOString();
    const hash = contentHash(validated);
    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO lessons (
            id, day, title, category, lesson_date, summary, content,
            images_json, references_json, related_topics_json, tags_json,
            estimated_minutes, publication_status, current_version_number,
            content_hash, github_sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, 'pending', ?, ?)`,
        )
        .run(
          lessonId,
          day,
          validated.title,
          validated.category,
          validated.lessonDate,
          validated.summary,
          validated.markdown,
          JSON.stringify(validated.images),
          JSON.stringify(validated.references),
          JSON.stringify(validated.relatedTopics),
          JSON.stringify(validated.tags),
          validated.estimatedMinutes,
          hash,
          now,
          now,
        );
      const versionId = this.insertVersion(
        lessonId,
        1,
        validated,
        hash,
        "draft",
        now,
      );
      this.enqueueSyncJob(lessonId, versionId, "create", null, now);
    });
    transaction();
    return this.getLesson(lessonId);
  }

  updateDraft(
    id: string,
    input: LessonEditorInput,
    expectedVersionNumber: number,
  ): ManagedLessonDetail {
    const current = this.getLessonRow(id);
    if (current.publication_status === "archived") {
      throw new ContentManagementError(
        "INVALID_STATUS_TRANSITION",
        "已封存教材不可修改。",
        409,
      );
    }
    if (current.current_version_number !== expectedVersionNumber) {
      throw new ContentManagementError(
        "VERSION_CONFLICT",
        "教材已被其他操作更新，請重新載入。",
        409,
      );
    }
    const validated = validateEditorInput(input);
    const nextVersion = current.current_version_number + 1;
    const now = new Date().toISOString();
    const hash = contentHash(validated);
    const transaction = this.database.transaction(() => {
      const result = this.database
        .prepare(
          `UPDATE lessons
           SET title = ?, category = ?, lesson_date = ?, summary = ?, content = ?,
               images_json = ?, references_json = ?, related_topics_json = ?,
               tags_json = ?, estimated_minutes = ?, current_version_number = ?,
               content_hash = ?, github_sync_status = 'pending', updated_at = ?
           WHERE id = ? AND current_version_number = ?`,
        )
        .run(
          validated.title,
          validated.category,
          validated.lessonDate,
          validated.summary,
          validated.markdown,
          JSON.stringify(validated.images),
          JSON.stringify(validated.references),
          JSON.stringify(validated.relatedTopics),
          JSON.stringify(validated.tags),
          validated.estimatedMinutes,
          nextVersion,
          hash,
          now,
          id,
          expectedVersionNumber,
        );
      if (result.changes !== 1) {
        throw new ContentManagementError(
          "VERSION_CONFLICT",
          "教材版本已變更。",
          409,
        );
      }
      this.database
        .prepare(
          `UPDATE github_sync_jobs
           SET status = 'cancelled', last_error_code = 'SUPERSEDED_BY_NEW_VERSION',
               last_error_message = 'A newer local version replaced this sync job.',
               updated_at = ?
           WHERE lesson_id = ? AND status IN ('pending', 'failed', 'conflict')`,
        )
        .run(now, id);
      const versionId = this.insertVersion(
        id,
        nextVersion,
        validated,
        hash,
        "draft",
        now,
      );
      this.enqueueSyncJob(
        id,
        versionId,
        current.github_path ? "update" : "create",
        current.github_blob_sha,
        now,
      );
    });
    transaction();
    return this.getLesson(id);
  }

  publishLesson(id: string, expectedVersionNumber: number): ManagedLessonDetail {
    const current = this.getLessonRow(id);
    if (current.publication_status === "archived") {
      throw new ContentManagementError(
        "INVALID_STATUS_TRANSITION",
        "已封存教材不可發布。",
        409,
      );
    }
    if (current.current_version_number !== expectedVersionNumber) {
      throw new ContentManagementError(
        "VERSION_CONFLICT",
        "教材版本已變更。",
        409,
      );
    }
    const validated = validateEditorInput({
      lessonId: current.id,
      day: current.day,
      title: current.title,
      category: current.category,
      lessonDate: current.lesson_date,
      summary: current.summary,
      markdown: current.content,
      estimatedMinutes: current.estimated_minutes,
    });
    const now = new Date().toISOString();
    const transaction = this.database.transaction(() => {
      const version = this.database
        .prepare(
          "SELECT * FROM lesson_versions WHERE lesson_id = ? AND version_number = ?",
        )
        .get(id, current.current_version_number) as VersionRow | undefined;
      if (!version) {
        throw new ContentManagementError("LESSON_NOT_FOUND", "找不到教材版本。", 404);
      }
      this.database
        .prepare(
          `UPDATE lesson_versions
           SET version_status = 'published', published_at = ?
           WHERE id = ?`,
        )
        .run(now, version.id);
      this.database
        .prepare(
          `UPDATE lessons
           SET publication_status = 'published', published_at = ?,
               archived_at = NULL, published_version_id = ?
           WHERE id = ?`,
        )
        .run(now, version.id, id);
    });
    transaction();
    return this.getLesson(id);
  }

  archiveLesson(id: string): ManagedLessonDetail {
    const current = this.getLessonRow(id);
    if (current.publication_status === "archived") {
      throw new ContentManagementError(
        "INVALID_STATUS_TRANSITION",
        "教材已經封存。",
        409,
      );
    }
    const now = new Date().toISOString();
    this.database
      .prepare(
        `UPDATE lessons
         SET publication_status = 'archived', archived_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(now, now, id);
    return this.getLesson(id);
  }

  getVersion(id: string, versionNumber: number): ManagedLessonVersion {
    const row = this.getLessonRow(id);
    const version = this.database
      .prepare(
        "SELECT * FROM lesson_versions WHERE lesson_id = ? AND version_number = ?",
      )
      .get(id, versionNumber) as VersionRow | undefined;
    if (!version) {
      throw new ContentManagementError("LESSON_NOT_FOUND", "找不到教材版本。", 404);
    }
    return this.toVersion(version, row);
  }

  getSyncJobs(id: string): GitHubSyncJobView[] {
    this.getLessonRow(id);
    return (
      this.database
        .prepare(
          "SELECT * FROM github_sync_jobs WHERE lesson_id = ? ORDER BY id DESC",
        )
        .all(id) as SyncJobRow[]
    ).map(syncJobView);
  }

  async syncLesson(id: string): Promise<GitHubSyncJobView> {
    if (!this.github) {
      throw new ContentManagementError(
        "GITHUB_SYNC_DISABLED",
        "GitHub 同步目前停用，需明確設定 GITHUB_SYNC_ENABLED=true。",
        503,
      );
    }
    const lesson = this.getLessonRow(id);
    if (lesson.publication_status === "archived") {
      throw new ContentManagementError(
        "INVALID_STATUS_TRANSITION",
        "已封存教材不可同步。",
        409,
      );
    }
    const job = this.database
      .prepare(
        `SELECT * FROM github_sync_jobs
         WHERE lesson_id = ? AND status IN ('pending', 'failed')
         ORDER BY id DESC LIMIT 1`,
      )
      .get(id) as SyncJobRow | undefined;
    if (!job) {
      const inProgress = this.database
        .prepare(
          "SELECT * FROM github_sync_jobs WHERE lesson_id = ? ORDER BY id DESC LIMIT 1",
        )
        .get(id) as SyncJobRow | undefined;
      if (inProgress?.status === "in_progress") {
        throw new ContentManagementError(
          "GITHUB_SYNC_IN_PROGRESS",
          "這個教材正在同步，請勿重複提交。",
          409,
        );
      }
      if (inProgress?.status === "conflict") {
        throw new ContentManagementError(
          "GITHUB_SYNC_CONFLICT",
          "GitHub 版本衝突尚未解決，系統不會強制覆蓋。",
          409,
        );
      }
      if (inProgress?.status === "synced") {
        return syncJobView(inProgress);
      }
      throw new ContentManagementError(
        "GITHUB_SYNC_FAILED",
        "找不到可同步的版本。",
        409,
      );
    }

    const now = new Date().toISOString();
    const claimed = this.database
      .prepare(
        `UPDATE github_sync_jobs
         SET status = 'in_progress', attempt_count = attempt_count + 1,
             last_error_code = NULL, last_error_message = NULL, updated_at = ?
         WHERE id = ? AND status IN ('pending', 'failed')`,
      )
      .run(now, job.id);
    if (claimed.changes !== 1) {
      throw new ContentManagementError(
        "GITHUB_SYNC_IN_PROGRESS",
        "同步工作已被其他請求接手。",
        409,
      );
    }
    this.database
      .prepare(
        "UPDATE lessons SET github_sync_status = 'in_progress' WHERE id = ?",
      )
      .run(id);

    const version = this.database
      .prepare("SELECT * FROM lesson_versions WHERE id = ?")
      .get(job.version_id) as VersionRow | undefined;
    if (!version) {
      throw new ContentManagementError("LESSON_NOT_FOUND", "同步版本不存在。", 404);
    }

    let remote: GitHubLessonFile;
    try {
      const path = job.github_path ?? lesson.github_path;
      const expectedSha = job.expected_blob_sha ?? lesson.github_blob_sha;
      remote =
        path && expectedSha
          ? await this.github.updateLesson({
              path,
              title: version.title,
              markdown: version.markdown,
              expectedSha,
            })
          : await this.github.createLesson({
              lessonId: id,
              category: version.category,
              title: version.title,
              markdown: version.markdown,
            });
    } catch (error) {
      const conflict = error instanceof GitHubShaConflictError;
      const safe = safeError(error);
      const status = conflict ? "conflict" : "failed";
      const finishedAt = new Date().toISOString();
      this.database
        .prepare(
          `UPDATE github_sync_jobs
           SET status = ?, last_error_code = ?, last_error_message = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(status, safe.code, safe.message, finishedAt, job.id);
      this.database
        .prepare("UPDATE lessons SET github_sync_status = ? WHERE id = ?")
        .run(status, id);
      throw new ContentManagementError(
        conflict ? "GITHUB_SYNC_CONFLICT" : "GITHUB_SYNC_FAILED",
        safe.message,
        conflict ? 409 : 502,
      );
    }

    const recoveryRecord: GitHubSyncRecoveryRecord = {
      jobId: job.id,
      lessonId: id,
      versionId: version.id,
      remote,
      recordedAt: new Date().toISOString(),
    };
    try {
      const persisted = this.database.transaction(() => {
        const finishedAt = new Date().toISOString();
        this.database
          .prepare(
            `UPDATE lesson_versions
             SET github_path = ?, github_branch = ?, github_blob_sha = ?,
                 github_commit_sha = ?, github_sync_status = 'synced', synced_at = ?
             WHERE id = ?`,
          )
          .run(
            remote.path,
            this.githubBranch ?? lesson.github_branch,
            remote.sha,
            remote.commitSha,
            finishedAt,
            version.id,
          );
        this.database
          .prepare(
            `UPDATE github_sync_jobs
             SET status = 'synced', github_path = ?, github_blob_sha = ?,
                 github_commit_sha = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(remote.path, remote.sha, remote.commitSha, finishedAt, job.id);
        const current = this.getLessonRow(id);
        const isCurrent = current.current_version_number === version.version_number;
        this.database
          .prepare(
            `UPDATE lessons
             SET github_path = ?, github_branch = ?, github_blob_sha = ?, github_commit_sha = ?,
                 github_last_synced_at = ?, github_sync_status = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(
            remote.path,
            this.githubBranch ?? lesson.github_branch,
            remote.sha,
            remote.commitSha,
            finishedAt,
            isCurrent ? "synced" : "pending",
            finishedAt,
            id,
          );
        this.database
          .prepare(
            `UPDATE github_sync_jobs
             SET operation = 'update', expected_blob_sha = ?, github_path = ?,
                 updated_at = ?
             WHERE lesson_id = ? AND id <> ? AND status = 'pending'`,
          )
          .run(remote.sha, remote.path, finishedAt, id, job.id);
      });
      persisted();
    } catch {
      try {
        this.recoveryStore.save(recoveryRecord);
      } catch {
        // The safe remote metadata is still returned in the thrown API error below.
      }
      throw new ContentManagementError(
        "GITHUB_SYNC_PERSISTENCE_FAILED",
        `GitHub 已更新，但 SQLite 同步結果保存失敗。復原資料：job ${job.id}, commit ${remote.commitSha}.`,
        500,
      );
    }

    return syncJobView(
      this.database
        .prepare("SELECT * FROM github_sync_jobs WHERE id = ?")
        .get(job.id) as SyncJobRow,
    );
  }

  async getGitHubHistory(
    id: string,
    limit = 30,
  ): Promise<GitHubLessonHistoryEntry[]> {
    if (!this.github) {
      throw new ContentManagementError(
        "GITHUB_SYNC_DISABLED",
        "GitHub 同步目前停用。",
        503,
      );
    }
    const lesson = this.getLessonRow(id);
    if (!lesson.github_path) {
      throw new ContentManagementError(
        "GITHUB_NOT_FOUND",
        "教材尚未同步至 GitHub。",
        404,
      );
    }
    return this.github.getLessonHistory({ path: lesson.github_path }, limit);
  }

  async getGitHubVersion(id: string, commitSha: string) {
    if (!this.github) {
      throw new ContentManagementError(
        "GITHUB_SYNC_DISABLED",
        "GitHub 同步目前停用。",
        503,
      );
    }
    const lesson = this.getLessonRow(id);
    if (!lesson.github_path) {
      throw new ContentManagementError(
        "GITHUB_NOT_FOUND",
        "教材尚未同步至 GitHub。",
        404,
      );
    }
    return this.github.getLessonVersion(
      { path: lesson.github_path },
      commitSha,
    );
  }

  private getLessonRow(id: string): LessonRow {
    const row = this.database
      .prepare("SELECT * FROM lessons WHERE id = ?")
      .get(id) as LessonRow | undefined;
    if (!row) {
      throw new ContentManagementError("LESSON_NOT_FOUND", "找不到教材。", 404);
    }
    return row;
  }

  private insertVersion(
    lessonId: string,
    versionNumber: number,
    input: ReturnType<typeof validateEditorInput>,
    hash: string,
    status: PublicationStatus,
    createdAt: string,
  ): number {
    const result = this.database
      .prepare(
        `INSERT INTO lesson_versions (
          lesson_id, version_number, title, category, lesson_date, summary,
          markdown, images_json, references_json, related_topics_json, tags_json,
          estimated_minutes, content_hash, version_status, github_sync_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only', ?)`,
      )
      .run(
        lessonId,
        versionNumber,
        input.title,
        input.category,
        input.lessonDate,
        input.summary,
        input.markdown,
        JSON.stringify(input.images),
        JSON.stringify(input.references),
        JSON.stringify(input.relatedTopics),
        JSON.stringify(input.tags),
        input.estimatedMinutes,
        hash,
        status,
        createdAt,
      );
    return Number(result.lastInsertRowid);
  }

  private enqueueSyncJob(
    lessonId: string,
    versionId: number,
    operation: "create" | "update",
    expectedBlobSha: string | null,
    createdAt: string,
  ): void {
    const idempotencyKey = `${lessonId}:${versionId}:${operation}`;
    this.database
      .prepare(
        `INSERT INTO github_sync_jobs (
          lesson_id, version_id, operation, idempotency_key, status,
          attempt_count, expected_blob_sha, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)
        ON CONFLICT(idempotency_key) DO NOTHING`,
      )
      .run(
        lessonId,
        versionId,
        operation,
        idempotencyKey,
        expectedBlobSha,
        createdAt,
        createdAt,
      );
  }

  private toSummary(
    row: LessonRow,
    latestSyncError: string | null,
  ): ManagedLessonSummary {
    const publishedVersion = row.published_version_id
      ? (this.database
          .prepare("SELECT version_number FROM lesson_versions WHERE id = ?")
          .get(row.published_version_id) as { version_number: number } | undefined)
      : undefined;
    return {
      id: row.id,
      day: row.day,
      title: row.title,
      category: row.category,
      lessonDate: row.lesson_date,
      summary: row.summary,
      publishedStatus: publicationStatus(row.publication_status),
      githubSyncStatus: row.github_sync_status as ManagedLessonSummary["githubSyncStatus"],
      githubPath: row.github_path,
      githubBranch: row.github_branch,
      githubBlobSha: row.github_blob_sha,
      githubCommitSha: row.github_commit_sha,
      githubLastSyncedAt: row.github_last_synced_at,
      publishedAt: row.published_at,
      archivedAt: row.archived_at,
      currentVersionNumber: row.current_version_number,
      publishedVersionId: row.published_version_id,
      hasUnpublishedChanges:
        !publishedVersion ||
        publishedVersion.version_number !== row.current_version_number,
      updatedAt: row.updated_at,
      latestSyncError,
    };
  }

  private toVersion(
    version: VersionRow,
    lesson: LessonRow,
  ): ManagedLessonVersion {
    return {
      id: version.id,
      versionNumber: version.version_number,
      versionStatus: publicationStatus(version.version_status),
      githubSyncStatus:
        version.github_sync_status as ManagedLessonVersion["githubSyncStatus"],
      title: version.title,
      category: version.category,
      summary: version.summary,
      markdown: version.markdown,
      createdAt: version.created_at,
      publishedAt: version.published_at,
      githubPath: version.github_path,
      githubBranch: version.github_branch,
      githubBlobSha: version.github_blob_sha,
      githubCommitSha: version.github_commit_sha,
      isCurrent: version.version_number === lesson.current_version_number,
    };
  }
}
