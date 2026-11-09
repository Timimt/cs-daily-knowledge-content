# Phase 2 Database Recovery

## Before migration

The Phase 2 migration was applied only after creating an independent SQLite Online Backup:

```text
C:\Users\Timimt\Documents\Codex\backups\cs-daily-knowledge\cs-daily_pre_phase2_20261108-192621.db
```

The live application must be stopped before restoring this file.

## Migrations added

- `002_content_management.sql`
  - Adds content publication, GitHub metadata, local version, and sync-outbox fields.
  - Backfills version 1 of every existing lesson as published.
- `003_auth.sql`
  - Adds hashed sessions and login-attempt rate-limiting tables.
- `004_existing_sync_outbox.sql`
  - Queues each existing published version as a pending GitHub sync job.
  - Does not call GitHub; jobs require a later explicit authenticated sync request.

Migration records are stored in `schema_migrations`.

## Preferred rollback

The safest rollback is restoring the pre-Phase 2 backup while preserving the failed database separately:

1. Stop the API and Vite servers.
2. Copy `data/cs-daily.db`, `data/cs-daily.db-wal`, and `data/cs-daily.db-shm` to a separate incident directory.
3. Copy the pre-Phase 2 backup to a temporary file.
4. Verify it with `PRAGMA integrity_check`, `PRAGMA quick_check`, and `PRAGMA foreign_key_check`.
5. Confirm the restored counts:
   - lessons: 3
   - quiz_questions: 9
   - learning_records: 2
   - quiz_attempts: 1
6. Replace the live database only after the restored file passes those checks.
7. Start the application and verify the health endpoint and existing lesson pages.

Do not edit the live database in place to undo migrations.

## Partial recovery

If the migration fails before commit, SQLite rolls back the active migration transaction.

If the schema migration succeeds but Phase 2 app code is unavailable, keep the new columns and tables in place and restore the previous application build. The added fields have defaults and the original lesson tables remain readable.

## After content-management use

Once Phase 2 management has created or edited lessons, restoring the pre-Phase 2 backup intentionally discards those Phase 2-only records. Export the current database with the SQLite Online Backup API first and compare record counts before choosing a rollback point.
