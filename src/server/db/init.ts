import { sql } from "drizzle-orm";
import { db, sqlite } from "./index";
import { applyDatabaseMigrations } from "./migrate";
import { seedLessons } from "./seed";

export function initializeDatabase(): void {
  applyDatabaseMigrations(sqlite, {
    beforeMigration: (version) => {
      if (version === "002_content_management") seedLessons();
    },
  });
  seedLessons();
}

export function closeDatabase(): void {
  sqlite.close();
}

export function pingDatabase(): boolean {
  return Boolean(db.get(sql`select 1 as ok`));
}
