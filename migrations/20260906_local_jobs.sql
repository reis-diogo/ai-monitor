-- Correcao pendente: RLS ficou ligado ao criar a tabela pelo dashboard
alter table ai_prompts disable row level security;

-- Tarefas delegadas para a IA local do usuario.
-- O token e a unica credencial do endpoint de ingestao (a CLI nao tem sessao do Clerk),
-- por isso guardamos so o hash, com validade e escopo fixo de cards.
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

alter table local_jobs disable row level security;
