# CS Daily Knowledge Roadmap

## Phase 1 - Local-first learning platform (completed)

- [x] React + Vite + TypeScript mobile-first interface
- [x] Node.js API with local SQLite persistence and Drizzle ORM
- [x] Three complete seed lessons with Markdown, KaTeX, SVG diagrams, references, and quizzes
- [x] Dashboard, lesson reader, knowledge search, quiz records, bookmarks, completion state, and learning progress
- [x] AI search interface using clearly labeled demo data only
- [x] Responsive layouts and light/dark themes

## Phase 2 - Protected content management core (completed except real GitHub verification)

- [x] SQLite publication, GitHub metadata, version, and sync-outbox schema
- [x] Draft, published, and archived lifecycle
- [x] Published-version snapshots separated from working edits
- [x] Single-user scrypt login, database sessions, CSRF, and rate limiting
- [x] Protected content-management API
- [x] Mobile-first content list, Markdown editor, preview, versions, publish, archive, and sync controls
- [x] Mock-tested GitHub create, update, SHA conflict, retry, and recovery metadata
- [ ] Real GitHub API verification with the private repository

## Phase 3 - DeepSeek integration

- Server-only DeepSeek provider with environment-based API key
- Keyword retrieval over lesson chunks
- Grounded answers with validated lesson citations
- Bounded conversation context and API usage logs

## Phase 4 - Daily generation

- Protected scheduled lesson generation
- Article versioning and draft review
- Retryable publishing jobs

## Phase 5 - Mobile notifications

- Telegram Bot API integration
- Manual test notification and daily delivery

## Phase 6 - Knowledge graph and review

- Related-knowledge navigation
- Spaced review and wrong-answer practice
- Learning analytics

## Phase 7 - Deployment hardening

- Persistent production database and backups
- Authentication and deployment
- Operational monitoring
