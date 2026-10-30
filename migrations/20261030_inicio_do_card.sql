create table if not exists activity_started (
  activity_id text primary key,
  started_at timestamptz not null default now()
);

alter table activity_started enable row level security;
