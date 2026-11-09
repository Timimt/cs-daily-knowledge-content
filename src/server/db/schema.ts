import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  day: integer("day").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  lessonDate: text("lesson_date").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  imagesJson: text("images_json").notNull().default("[]"),
  referencesJson: text("references_json").notNull().default("[]"),
  relatedTopicsJson: text("related_topics_json").notNull().default("[]"),
  tagsJson: text("tags_json").notNull().default("[]"),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  githubPath: text("github_path"),
  githubBranch: text("github_branch"),
  githubBlobSha: text("github_blob_sha"),
  githubCommitSha: text("github_commit_sha"),
  githubSyncStatus: text("github_sync_status").notNull().default("local_only"),
  githubLastSyncedAt: text("github_last_synced_at"),
  publicationStatus: text("publication_status").notNull().default("draft"),
  publishedAt: text("published_at"),
  archivedAt: text("archived_at"),
  publishedVersionId: integer("published_version_id"),
  currentVersionNumber: integer("current_version_number").notNull().default(1),
  contentHash: text("content_hash").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const quizQuestions = sqliteTable("quiz_questions", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  optionsJson: text("options_json").notNull(),
  correctOption: integer("correct_option").notNull(),
  explanation: text("explanation").notNull(),
});

export const learningRecords = sqliteTable("learning_records", {
  lessonId: text("lesson_id")
    .primaryKey()
    .references(() => lessons.id, { onDelete: "cascade" }),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  bookmarked: integer("bookmarked", { mode: "boolean" }).notNull().default(false),
  lastReadAt: text("last_read_at"),
  readCount: integer("read_count").notNull().default(0),
  quizScore: integer("quiz_score"),
  quizTotal: integer("quiz_total"),
  wrongAnswersJson: text("wrong_answers_json").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  answersJson: text("answers_json").notNull(),
  wrongAnswersJson: text("wrong_answers_json").notNull().default("[]"),
  attemptedAt: text("attempted_at").notNull(),
});

export const lessonVersions = sqliteTable("lesson_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  lessonDate: text("lesson_date").notNull(),
  summary: text("summary").notNull(),
  markdown: text("markdown").notNull(),
  imagesJson: text("images_json").notNull().default("[]"),
  referencesJson: text("references_json").notNull().default("[]"),
  relatedTopicsJson: text("related_topics_json").notNull().default("[]"),
  tagsJson: text("tags_json").notNull().default("[]"),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  contentHash: text("content_hash").notNull(),
  versionStatus: text("version_status").notNull().default("draft"),
  githubPath: text("github_path"),
  githubBranch: text("github_branch"),
  githubBlobSha: text("github_blob_sha"),
  githubCommitSha: text("github_commit_sha"),
  githubSyncStatus: text("github_sync_status").notNull().default("local_only"),
  syncedAt: text("synced_at"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
});

export const githubSyncJobs = sqliteTable("github_sync_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  versionId: integer("version_id")
    .notNull()
    .references(() => lessonVersions.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  nextAttemptAt: text("next_attempt_at"),
  expectedBlobSha: text("expected_blob_sha"),
  githubPath: text("github_path"),
  githubBlobSha: text("github_blob_sha"),
  githubCommitSha: text("github_commit_sha"),
  recoveryJson: text("recovery_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  sessionHash: text("session_hash").primaryKey(),
  csrfHash: text("csrf_hash").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  userAgentHash: text("user_agent_hash"),
});

export const authLoginAttempts = sqliteTable("auth_login_attempts", {
  clientHash: text("client_hash").primaryKey(),
  failureCount: integer("failure_count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
  blockedUntil: text("blocked_until"),
  updatedAt: text("updated_at").notNull(),
});

export type LessonRow = typeof lessons.$inferSelect;
export type QuizQuestionRow = typeof quizQuestions.$inferSelect;
export type LearningRecordRow = typeof learningRecords.$inferSelect;
export type QuizAttemptRow = typeof quizAttempts.$inferSelect;
export type LessonVersionRow = typeof lessonVersions.$inferSelect;
export type GitHubSyncJobRow = typeof githubSyncJobs.$inferSelect;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type AuthLoginAttemptRow = typeof authLoginAttempts.$inferSelect;
