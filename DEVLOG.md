# Development Log

## 2026-11-08 - Phase 1 kickoff

### Pre-development check

- The workspace contained only Phase 1 planning artifacts under `work/` and `outputs/`.
- No application source, package manifest, database schema, or `ROADMAP.md` existed.
- The planning document recommended a managed PostgreSQL deployment, but the formal Phase 1 brief explicitly requires a new local project to use SQLite under `data/`.
- The conflict is scoped to deployment storage. SQLite is viable for the required local-first Phase 1, so the implementation will follow the formal brief while keeping portable SQL and ORM-defined models for a future PostgreSQL migration.

### Decisions

- Use one React + Vite application and one Node/Express API project.
- Use Drizzle ORM with SQLite in `data/cs-daily.db`.
- Keep quiz answers and explanations exclusively in server-side tables.
- Expose lesson content and quiz prompts through the API, but return correct answers only from the quiz submission endpoint.
- Use React Router for client-side navigation and server-side SQL filtering for search.
- Store all learning records in SQLite; browser local storage is limited to the theme preference.

## 2026-11-08 - Phase 1 completed

### Implemented

- Created the React + Vite + TypeScript application and the Node/Express API in one repository.
- Added Drizzle schema, a portable SQL migration, runtime initialization, and idempotent seed logic.
- Added three full Markdown lessons: AES/RSA, Windows Process/API, and ransomware hybrid encryption.
- Added inline teaching SVG diagrams, KaTeX math, GFM tables, syntax-highlighted code, references, related topics, and mobile image zoom.
- Added dashboard metrics, category distribution, recent reading, knowledge search, category filters, bookmarks, completion state, quiz attempts, scores, and wrong-answer records.
- Added the AI interface with explicit demo messaging, three answer-mode previews, loading and error states, and source-card placeholders. No DeepSeek request is made.
- Added responsive light/dark/system themes and five-item mobile navigation.
- Added unit and Edge end-to-end tests.

### Implementation notes

- SQLite remains viable for this local-first scope. The database file is stored at `data/cs-daily.db` and uses WAL mode.
- Free-text lesson content is stored in Markdown. Images, references, related topics, tags, options, and wrong answers are stored as application-layer JSON strings; no SQLite JSON operators are required.
- Correct quiz answers and explanations are never selected by the public lesson endpoint. They are read only inside the quiz submission service.
- The Node 24 runtime in this Windows environment throws `ENOMEM` from `os.userInfo()`, which prevents `tsx` from starting. The project uses esbuild to bundle the server and then launches the generated file with Node.
- pnpm uses a hoisted node-module layout on Windows to avoid symbol-link EPERM failures.

### Verification

- `pnpm typecheck` passed.
- `pnpm test` passed: 1 test file, 5 unit tests.
- `pnpm test:e2e` passed: 8 Edge tests covering navigation, search, all three lesson formats, persistence, quizzes, AI demo states, responsive widths, desktop layout, and browser console/page errors.
- `pnpm build` passed for Vite and the bundled Node API.
- `pnpm dev` started both Vite and the API from one command.
- `pnpm start` served `/`, a direct `/knowledge` route, and `/api/health` from the production build.
- The API was restarted after a bookmark, completion, and quiz attempt. The record remained in SQLite, confirming server-restart persistence.
- The test database was archived under `work/` and a clean final database was regenerated with 3 lessons, 9 questions, 0 learning records, and 0 quiz attempts.

## 2026-11-08 - GitHub lesson storage engine

### Added

- Added `GitHubContentService` under `src/server/services/github-content/`.
- Added strict repository configuration validation using server-only environment variables.
- Added deterministic lesson paths in the form `lessons/<category>/<lesson-id>.md`.
- Added create, read, update, commit-history, and historical-version operations.
- Added SHA-based optimistic updates and explicit conflict handling.
- Added token-safe errors for timeout, network, authentication, rate limit, 404, 409, 422, and general API failures.
- Added path traversal, category, extension, lesson ID, and Markdown-size validation.
- Added a deletion method that always rejects deletion to preserve history.
- Added an in-memory mock GitHub API test suite.

### Scope decisions

- No HTTP endpoints were added because the current application has no authentication suitable for a public GitHub write API.
- No real GitHub repository or token was required or used.
- No SQLite table, schema, migration, record, or application data was changed.
- No image-upload method was added in this phase because only Markdown lesson operations were specified.

### Verification

- `pnpm typecheck` passed.
- `pnpm test:github-content` passed all 9 mock API tests.
- Full unit suite passed: 2 files and 14 tests.
- Live SQLite and the Phase 0 backup still match:
  - 3 lessons
  - 9 quiz questions
  - 2 learning records
  - 1 quiz attempt
- SQLite schema comparison passed and `integrity_check` remains `ok`.
- No real GitHub API test was performed because no Private Repository or token was provided.

## 2026-11-08 - Phase 2 protected content-management core

### Data safety and migration

- Created and verified a pre-migration SQLite Online Backup at
  `C:\Users\Timimt\Documents\Codex\backups\cs-daily-knowledge\cs-daily_pre_phase2_20261108-192621.db`.
- Added `schema_migrations`, `lesson_versions`, `github_sync_jobs`,
  `auth_sessions`, and `auth_login_attempts`.
- Added publication, GitHub metadata, sync state, version counters, content hashes, and lifecycle timestamps to `lessons`.
- Backfilled version 1 of the existing three lessons as published.
- Verified the original lesson content, 9 questions, 2 learning records, and 1 quiz attempt remain unchanged.
- Added recovery and rollback guidance in `docs/PHASE2_DATABASE_RECOVERY.md`.

### Authentication and API security

- Added scrypt password hashing and verification.
- Added database-backed sessions with only hashed session identifiers.
- Added HttpOnly/SameSite=Strict cookies and production Secure-cookie behavior.
- Added CSRF double-submit tokens and session-bound CSRF hashes.
- Added per-client login failure limits and 15-minute blocking.
- Protected every existing state-changing API and the content-management API.
- Public lesson reads omit personal learning state when no session exists.
- Protected the learning-progress page and API.
- Added interactive password-hash and session-secret generation scripts.
- Authentication remains disabled at runtime because the current `.env` has no authentication secrets.

### Content lifecycle and synchronization

- Added draft, published, and archived rules.
- Published edits now remain unpublished working versions until explicitly published.
- Public lesson reads use the published version snapshot.
- Added local version history and historical-version reads.
- Added an idempotent GitHub sync outbox with duplicate-submit protection.
- Added create/update synchronization through an injected GitHub client.
- SHA conflicts are marked as `conflict` and never force-overwrite.
- Failed sync/retry paths preserve the SQLite working copy and increment attempts.
- Added file-based recovery metadata for the case where GitHub succeeds but the SQLite sync transaction fails.
- GitHub writes remain disabled unless `GITHUB_SYNC_ENABLED=true` is explicitly set.

### Frontend

- Added the `/admin/login` single-user login screen.
- Added the `/admin` protected lesson list with publication and sync status.
- Added Markdown editor, responsive preview, save, publish, archive, sync, local versions, historical-version preview, and explicit remote-history controls.
- Added clear unpublished-change and independent sync-state indicators.
- Added login prompts for personal learning actions.

### Verification

- `pnpm typecheck` passed.
- `pnpm test` passed: 5 test files and 31 tests.
- `pnpm test:e2e` passed: production build plus 10 Edge tests using a temporary SQLite copy.
- E2E covered login, CSRF, existing search/lesson/quiz/bookmark behavior, mobile layouts, admin create/preview/save, sync-disabled feedback, publish, version view, and archive.
- Production build passed.
- Final read-only comparison confirmed 3 lessons, 9 questions, 2 learning records, and 1 quiz attempt with original content unchanged.
- SQLite `integrity_check` is `ok`; `foreign_key_check` has no violations.
- No real GitHub API read or write was performed.
