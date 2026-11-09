import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { applyDatabaseMigrations } from "../../../src/server/db/migrate";

export type TestDatabase = {
  database: Database.Database;
  directory: string;
  path: string;
  cleanup: () => void;
};

export function createLegacyTestDatabase(): TestDatabase {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cs-daily-phase2-"));
  const databasePath = path.join(directory, "test.db");
  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  const initialSql = fs.readFileSync(
    path.join(
      process.cwd(),
      "src",
      "server",
      "db",
      "migrations",
      "001_initial.sql",
    ),
    "utf8",
  );
  database.exec(initialSql);
  seedLegacyData(database);
  applyDatabaseMigrations(database);
  return {
    database,
    directory,
    path: databasePath,
    cleanup: () => {
      database.close();
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

function seedLegacyData(database: Database.Database): void {
  const insertLesson = database.prepare(`
    INSERT INTO lessons (
      id, day, title, category, lesson_date, summary, content,
      images_json, references_json, related_topics_json, tags_json,
      estimated_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', 8, ?, ?)
  `);
  ["001", "002", "003"].forEach((suffix, index) => {
    const date = `2026-11-0${index + 6}`;
    const timestamp = `${date}T00:00:00.000Z`;
    insertLesson.run(
      `day-${suffix}`,
      index + 1,
      `Lesson ${index + 1}`,
      index === 1 ? "作業系統與 Windows" : "資訊安全與密碼學",
      date,
      `Summary ${index + 1}`,
      `# Lesson ${index + 1}\n\nOriginal content.`,
      timestamp,
      timestamp,
    );
  });

  const insertQuestion = database.prepare(`
    INSERT INTO quiz_questions (
      id, lesson_id, position, prompt, options_json, correct_option, explanation
    ) VALUES (?, ?, ?, ?, '["A","B"]', 0, 'Explanation')
  `);
  for (let day = 1; day <= 3; day += 1) {
    for (let question = 1; question <= 3; question += 1) {
      insertQuestion.run(
        `day-00${day}-q${question}`,
        `day-00${day}`,
        question,
        `Question ${question}`,
      );
    }
  }

  const insertRecord = database.prepare(`
    INSERT INTO learning_records (
      lesson_id, completed, bookmarked, last_read_at, read_count,
      quiz_score, quiz_total, wrong_answers_json, updated_at
    ) VALUES (?, 1, 0, ?, 1, 2, 3, '[]', ?)
  `);
  insertRecord.run("day-002", "2026-11-08T01:00:00.000Z", "2026-11-08T01:00:00.000Z");
  insertRecord.run("day-003", "2026-11-08T02:00:00.000Z", "2026-11-08T02:00:00.000Z");

  database
    .prepare(
      `INSERT INTO quiz_attempts (
        lesson_id, score, total, answers_json, wrong_answers_json, attempted_at
      ) VALUES ('day-003', 2, 3, '{}', '[]', ?)`,
    )
    .run("2026-11-08T02:00:00.000Z");
}
