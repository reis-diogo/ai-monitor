-- Weenow 360 — schema inicial
-- Todo o acesso ao Supabase acontece só no servidor (rotas /api do Next.js),
-- com a secret/service_role key em SUPABASE_SECRET_KEY (sem prefixo NEXT_PUBLIC_,
-- para nao poder ser embutida no bundle do navegador).
-- RLS fica LIGADO e sem policy: a service_role key passa por cima dele, entao o
-- app funciona, e a publishable/anon key nao le nem escreve nada se vazar.

create extension if not exists "pgcrypto";

create table if not exists repos (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  name text not null,
  url text not null,
  added_at timestamptz not null default now(),
  unique (owner, name)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  scope text
);

create table if not exists professionals (
  author_name text primary key,
  role text not null check (role in ('dev', 'po')),
  clickup_email text,
  avatar_url text,
  aliases text[] not null default '{}'
);

create table if not exists commit_cache (
  repo_owner text not null,
  repo_name text not null,
  sha text not null,
  message text not null,
  author_name text not null,
  author_avatar_url text,
  url text not null,
  date timestamptz not null,
  additions int not null default 0,
  deletions int not null default 0,
  diff text not null default '',
  primary key (repo_owner, repo_name, sha)
);

create table if not exists analysis_cache (
  provider text not null,
  activity_id text not null,
  source text not null check (source in ('commit', 'clickup')),
  intent text not null,
  score int not null,
  critique text not null,
  author_name text not null,
  author_avatar_url text,
  title text not null,
  url text not null,
  date timestamptz not null,
  location text not null,
  additions int,
  deletions int,
  analyzed_at timestamptz not null default now(),
  difficulty int,
  difficulty_reasoning text,
  architecture int,
  architecture_reasoning text,
  architecture_payload jsonb,
  primary key (provider, activity_id)
);

create table if not exists ai_prompts (
  key text primary key,
  label text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

create table if not exists project_analysis_cache (
  provider text not null,
  project_id uuid not null references projects (id) on delete cascade,
  project_name text not null,
  score int not null,
  critique text not null,
  missing_topics text[] not null default '{}',
  out_of_scope_work text[] not null default '{}',
  over_delivery text[] not null default '{}',
  commit_count int not null default 0,
  analyzed_at timestamptz not null default now(),
  primary key (provider, project_id)
);

create table if not exists local_jobs (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  provider text not null,
  project text not null,
  activity_ids text[] not null,
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  received_count int not null default 0
);

create index if not exists local_jobs_token_hash_idx on local_jobs (token_hash);

alter table repos enable row level security;
alter table projects enable row level security;
alter table professionals enable row level security;
alter table commit_cache enable row level security;
alter table analysis_cache enable row level security;
alter table project_analysis_cache enable row level security;
alter table ai_prompts enable row level security;
alter table local_jobs enable row level security;
