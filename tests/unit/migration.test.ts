import { describe, expect, it } from "vitest";
import { applyDatabaseMigrations } from "../../src/server/db/migrate";
import { createLegacyTestDatabase } from "./helpers/test-db";

describe("Phase 2 SQLite migration", () => {
  it("preserves legacy data and backfills published versions", () => {
    const fixture = createLegacyTestDatabase();
    try {
      const counts = {
        lessons: fixture.database
          .prepare("SELECT COUNT(*) AS count FROM lessons")
          .get(),
        quizzes: fixture.database
          .prepare("SELECT COUNT(*) AS count FROM quiz_questions")
          .get(),
        records: fixture.database
          .prepare("SELECT COUNT(*) AS count FROM learning_records")
          .get(),
        attempts: fixture.database
          .prepare("SELECT COUNT(*) AS count FROM quiz_attempts")
          .get(),
      } as Record<string, { count: number }>;
      expect(counts.lessons.count).toBe(3);
      expect(counts.quizzes.count).toBe(9);
      expect(counts.records.count).toBe(2);
      expect(counts.attempts.count).toBe(1);

      const publishedLessons = fixture.database
        .prepare(
          `SELECT id, publication_status, published_version_id, current_version_number
           FROM lessons ORDER BY id`,
        )
        .all() as Array<{
        id: string;
        publication_status: string;
        published_version_id: number;
        current_version_number: number;
      }>;
      expect(publishedLessons).toHaveLength(3);
      for (const lesson of publishedLessons) {
        expect(lesson.publication_status).toBe("published");
        expect(lesson.published_version_id).toBeGreaterThan(0);
        expect(lesson.current_version_number).toBe(1);
      }

      const versions = fixture.database
        .prepare("SELECT lesson_id, version_number, version_status FROM lesson_versions")
        .all();
      expect(versions).toHaveLength(3);
      expect(versions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            lesson_id: "day-001",
            version_number: 1,
            version_status: "published",
          }),
        ]),
      );

      const tables = fixture.database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        )
        .all()
        .map((row) => (row as { name: string }).name);
      expect(tables).toEqual(
        expect.arrayContaining([
          "auth_login_attempts",
          "auth_sessions",
          "github_sync_jobs",
          "lesson_versions",
          "schema_migrations",
        ]),
      );
      const syncJobs = fixture.database
        .prepare("SELECT lesson_id, status FROM github_sync_jobs ORDER BY lesson_id")
        .all();
      expect(syncJobs).toHaveLength(3);
      expect(syncJobs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lesson_id: "day-001", status: "pending" }),
        ]),
      );
      expect(
        fixture.database
          .prepare(
            "SELECT COUNT(*) AS count FROM lessons WHERE github_sync_status = 'pending'",
          )
          .get(),
      ).toEqual({ count: 3 });
      expect(fixture.database.pragma("integrity_check", { simple: true })).toBe("ok");
    } finally {
      fixture.cleanup();
    }
  });

  it("is idempotent when migrations run again", () => {
    const fixture = createLegacyTestDatabase();
    try {
      const result = applyDatabaseMigrations(fixture.database);
      expect(result.applied).toEqual([]);
      expect(result.skipped).toEqual([
        "001_initial",
        "002_content_management",
        "003_auth",
        "004_existing_sync_outbox",
      ]);
      expect(
        (
          fixture.database
            .prepare("SELECT COUNT(*) AS count FROM lesson_versions")
            .get() as { count: number }
        ).count,
      ).toBe(3);
    } finally {
      fixture.cleanup();
    }
  });
});
