ALTER TABLE lessons ADD COLUMN github_path TEXT;
ALTER TABLE lessons ADD COLUMN github_branch TEXT;
ALTER TABLE lessons ADD COLUMN github_blob_sha TEXT;
ALTER TABLE lessons ADD COLUMN github_commit_sha TEXT;
ALTER TABLE lessons ADD COLUMN github_sync_status TEXT NOT NULL DEFAULT 'local_only';
ALTER TABLE lessons ADD COLUMN github_last_synced_at TEXT;
ALTER TABLE lessons ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE lessons ADD COLUMN published_at TEXT;
ALTER TABLE lessons ADD COLUMN archived_at TEXT;
ALTER TABLE lessons ADD COLUMN published_version_id INTEGER;
ALTER TABLE lessons ADD COLUMN current_version_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE lessons ADD COLUMN content_hash TEXT NOT NULL DEFAULT '';

CREATE TABLE lesson_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  lesson_date TEXT NOT NULL,
  summary TEXT NOT NULL,
  markdown TEXT NOT NULL,
  images_json TEXT NOT NULL DEFAULT '[]',
  references_json TEXT NOT NULL DEFAULT '[]',
  related_topics_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  estimated_minutes INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  version_status TEXT NOT NULL DEFAULT 'draft',
  github_path TEXT,
  github_branch TEXT,
  github_blob_sha TEXT,
  github_commit_sha TEXT,
  github_sync_status TEXT NOT NULL DEFAULT 'local_only',
  synced_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE (lesson_id, version_number)
);

CREATE TABLE github_sync_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id TEXT NOT NULL,
  version_id INTEGER NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  last_error_message TEXT,
  next_attempt_at TEXT,
  expected_blob_sha TEXT,
  github_path TEXT,
  github_blob_sha TEXT,
  github_commit_sha TEXT,
  recovery_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES lesson_versions(id) ON DELETE CASCADE
);

CREATE INDEX idx_lessons_publication_status
  ON lessons(publication_status, archived_at);
CREATE INDEX idx_lessons_github_sync_status
  ON lessons(github_sync_status);
CREATE INDEX idx_lesson_versions_lesson
  ON lesson_versions(lesson_id, version_number DESC);
CREATE INDEX idx_github_sync_jobs_status
  ON github_sync_jobs(status, next_attempt_at);
