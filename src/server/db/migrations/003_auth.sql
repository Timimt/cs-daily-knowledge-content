CREATE TABLE auth_sessions (
  session_hash TEXT PRIMARY KEY NOT NULL,
  csrf_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent_hash TEXT
);

CREATE TABLE auth_login_attempts (
  client_hash TEXT PRIMARY KEY NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_auth_sessions_expires
  ON auth_sessions(expires_at);
