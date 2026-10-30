create table if not exists project_sources (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  clickup_list_id text not null unique,
  label text,
  webhook_id text,
  webhook_secret text,
  created_at timestamptz not null default now()
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  occurred_at timestamptz not null,
  actor_id text,
  actor_name text not null,
  actor_email text,
  list_id text not null,
  project_name text not null,
  task_id text not null,
  task_custom_id text,
  task_title text,
  kind text not null,
  from_status text,
  to_status text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_occurred_idx on activity_events (occurred_at desc);
create index if not exists activity_events_actor_idx on activity_events (actor_name, occurred_at desc);

alter table project_sources enable row level security;
alter table activity_events enable row level security;
