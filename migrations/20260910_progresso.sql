-- Progresso das etapas que rodam na maquina do usuario. A IA local avisa em que
-- ponto esta (arquiteto lendo metadados, dev aplicando, revisor conferindo) para
-- a linha do card mostrar que algo esta acontecendo agora.
--
-- activity_id e chave primaria: so faz sentido uma etapa correndo por card, e um
-- segundo prompt sobre o mesmo card sobrescreve o anterior em vez de acumular.
create table if not exists activity_progress (
  activity_id text primary key,
  kind text not null,
  stage text not null,
  detail text,
  state text not null default 'running',
  updated_at timestamptz not null default now()
);

create index if not exists activity_progress_updated_at_idx on activity_progress (updated_at desc);

alter table activity_progress enable row level security;
