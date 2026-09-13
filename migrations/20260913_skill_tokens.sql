-- Credencial de longa duracao para a skill do Claude, que roda na maquina da pessoa
-- e nao tem sessao do Clerk. Diferente do token de lote (12h, preso a cards
-- especificos), este descobre a fila e cria lotes sozinho — por isso e por pessoa,
-- guardado so como hash e revogavel um a um.
--
-- Sem RLS de proposito: a chave que o app usa no servidor e uma publishable key, que
-- respeita RLS. Ligar aqui bloquearia a propria aplicacao, como ja aconteceu em
-- activity_progress.
create table if not exists skill_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  owner_email text not null,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists skill_tokens_token_hash_idx on skill_tokens (token_hash);
create index if not exists skill_tokens_owner_idx on skill_tokens (owner_email);
