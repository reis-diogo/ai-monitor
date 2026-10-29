alter table activity_progress
  add column if not exists started_at timestamptz;
