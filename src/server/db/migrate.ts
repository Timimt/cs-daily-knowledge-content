import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type DatabaseType from "better-sqlite3";

type Migration = {
  version: string;
  filename: string;
  afterSql?: (database: DatabaseType.Database) => void;
};

export type DatabaseMigrationResult = {
  applied: string[];
  skipped: string[];
};

const migrations: Migration[] = [
  {
    version: "001_initial",
    filename: "001_initial.sql",
  },
  {
    version: "002_content_management",
    filename: "002_content_management.sql",
    afterSql: backfillLessonVersions,
  },
  {
    version: "003_auth",
    filename: "003_auth.sql",
  },
  {
    version: "004_existing_sync_outbox",
    filename: "004_existing_sync_outbox.sql",
  },
];

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function applyDatabaseMigrations(
  database: DatabaseType.Database,
  options: {
    beforeMigration?: (version: string, database: DatabaseType.Database) => void;
  } = {},
): DatabaseMigrationResult {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied: string[] = [];
  const skipped: string[] = [];
  const migrationDirectory = path.join(
    process.cwd(),
    "src",
    "server",
    "db",
    "migrations",
  );

  for (const migration of migrations) {
    const isAlreadyApplied = database
      .prepare("SELECT version FROM schema_migrations WHERE version = ?")
      .get(migration.version);
    if (isAlreadyApplied) {
      skipped.push(migration.version);
      continue;
    }

    options.beforeMigration?.(migration.version, database);
    const sqlPath = path.join(migrationDirectory, migration.filename);
    const sql = fs.readFileSync(sqlPath, "utf8");
    const checksum = crypto.createHash("sha256").update(sql, "utf8").digest("hex");
    const run = database.transaction(() => {
      database.exec(sql);
      migration.afterSql?.(database);
      database
        .prepare(
          "INSERT INTO schema_migrations (version, checksum, applied_at) VALUES (?, ?, ?)",
        )
        .run(migration.version, checksum, new Date().toISOString());
    });
    run();
    applied.push(migration.version);
  }

  return { applied, skipped };
}

function backfillLessonVersions(database: DatabaseType.Database): void {
  const lessons = database
    .prepare(
      `SELECT id, title, category, lesson_date, summary, content,
              images_json, references_json, related_topics_json, tags_json,
              estimated_minutes, created_at
       FROM lessons`,
    )
    .all() as Array<{
    id: string;
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
  }>;

  const insertVersion = database.prepare(`
    INSERT INTO lesson_versions (
      lesson_id, version_number, title, category, lesson_date, summary,
      markdown, images_json, references_json, related_topics_json, tags_json,
      estimated_minutes, content_hash, version_status, github_sync_status,
      published_at, created_at
    ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'local_only', ?, ?)
  `);
  const updateLesson = database.prepare(`
    UPDATE lessons
    SET publication_status = 'published',
        published_at = ?,
        published_version_id = ?,
        current_version_number = 1,
        content_hash = ?
    WHERE id = ?
  `);

  for (const lesson of lessons) {
    const contentHash = hashContent(lesson.content);
    const publishedAt = lesson.created_at || new Date().toISOString();
    const result = insertVersion.run(
      lesson.id,
      lesson.title,
      lesson.category,
      lesson.lesson_date,
      lesson.summary,
      lesson.content,
      lesson.images_json,
      lesson.references_json,
      lesson.related_topics_json,
      lesson.tags_json,
      lesson.estimated_minutes,
      contentHash,
      publishedAt,
      publishedAt,
    );
    updateLesson.run(
      publishedAt,
      Number(result.lastInsertRowid),
      contentHash,
      lesson.id,
    );
  }
}
