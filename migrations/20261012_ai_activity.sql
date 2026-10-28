create table if not exists ai_activity_prompts (
  owner_email text not null,
  prompt_id text not null,
  user_name text not null default 'Sem nome',
  status text not null default 'running',
  summary text not null default 'Pedido sem resumo',
  subject text not null default 'Outro',
  area text,
  project text not null default '—',
  repo text,
  activity text,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  kb_id text,
  primary key (owner_email, prompt_id)
);

create index if not exists ai_activity_prompts_owner_updated_idx
  on ai_activity_prompts (owner_email, updated_at desc);

create table if not exists ai_activity_knowledge (
  owner_email text not null,
  id text not null,
  prompt_id text,
  title text not null,
  technologies jsonb not null default '[]',
  summary text,
  steps jsonb not null default '[]',
  connection text,
  gotchas jsonb not null default '[]',
  snippets jsonb not null default '[]',
  user_name text,
  project text,
  subject text,
  created_at timestamptz not null default now(),
  primary key (owner_email, id)
);

create index if not exists ai_activity_knowledge_owner_created_idx
  on ai_activity_knowledge (owner_email, created_at desc);
