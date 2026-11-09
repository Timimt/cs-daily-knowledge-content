INSERT INTO github_sync_jobs (
  lesson_id,
  version_id,
  operation,
  idempotency_key,
  status,
  attempt_count,
  github_path,
  expected_blob_sha,
  created_at,
  updated_at
)
SELECT
  l.id,
  l.published_version_id,
  'create',
  'existing:' || l.id || ':' || l.published_version_id,
  'pending',
  0,
  NULL,
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM lessons AS l
WHERE l.published_version_id IS NOT NULL
  AND l.github_sync_status = 'local_only'
  AND NOT EXISTS (
    SELECT 1
    FROM github_sync_jobs AS j
    WHERE j.lesson_id = l.id
      AND j.version_id = l.published_version_id
  );

UPDATE lessons
SET github_sync_status = 'pending'
WHERE github_sync_status = 'local_only'
  AND published_version_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM github_sync_jobs AS j
    WHERE j.lesson_id = lessons.id
      AND j.version_id = lessons.published_version_id
      AND j.status = 'pending'
  );
