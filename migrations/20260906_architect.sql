-- Arquiteto Salesforce: nota/parecer por card + prompts editáveis pelo front

alter table analysis_cache
  add column if not exists architecture int,
  add column if not exists architecture_reasoning text,
  add column if not exists architecture_payload jsonb;

create table if not exists ai_prompts (
  key text primary key,
  label text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

alter table ai_prompts disable row level security;
