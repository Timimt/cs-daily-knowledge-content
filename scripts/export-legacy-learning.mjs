import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databasePath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? "data/cs-daily.db",
);
const outputDirectory = path.resolve("outputs");
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const outputPath = path.join(
  outputDirectory,
  `cs-daily-legacy-learning-${timestamp}.json`,
);

if (!fs.existsSync(databasePath)) {
  throw new Error(`SQLite database does not exist: ${databasePath}`);
}

const database = new Database(databasePath, {
  readonly: true,
  fileMustExist: true,
  timeout: 5_000,
});

try {
  database.pragma("query_only = ON");
  const records = database
    .prepare(
      `SELECT lesson_id, completed, bookmarked, last_read_at, read_count,
              quiz_score, quiz_total, wrong_answers_json, updated_at
         FROM learning_records
        ORDER BY lesson_id`,
    )
    .all()
    .map((row) => ({
      lessonId: row.lesson_id,
      completed: Boolean(row.completed),
      bookmarked: Boolean(row.bookmarked),
      lastReadAt: row.last_read_at,
      readCount: row.read_count,
      quizScore: row.quiz_score,
      quizTotal: row.quiz_total,
      wrongAnswers: parseJsonArray(row.wrong_answers_json),
      updatedAt: row.updated_at,
    }));

  const attempts = database
    .prepare(
      `SELECT a.lesson_id, l.title AS lesson_title, a.score, a.total,
              a.answers_json, a.wrong_answers_json, a.attempted_at
         FROM quiz_attempts AS a
         LEFT JOIN lessons AS l ON l.id = a.lesson_id
        ORDER BY a.attempted_at, a.id`,
    )
    .all()
    .map((row) => ({
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title ?? row.lesson_id,
      score: row.score,
      total: row.total,
      answers: parseJsonObject(row.answers_json),
      wrongAnswers: parseJsonArray(row.wrong_answers_json),
      attemptedAt: row.attempted_at,
    }));

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "cs-daily.sqlite",
    records,
    attempts,
  };
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(`Exported ${records.length} learning record(s) and ${attempts.length} quiz attempt(s).`);
  console.log(outputPath);
} finally {
  database.close();
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}
