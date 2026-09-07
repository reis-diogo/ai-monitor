-- Revisor de entrega: confere o que foi construido na org contra o devPrompt
-- que o arquiteto gerou, e decide entre "em qa" e "revisar dev".

alter table analysis_cache
  add column if not exists review int,
  add column if not exists review_reasoning text,
  add column if not exists review_payload jsonb;

-- Um mesmo lote agora pode ser de arquitetura ou de revisao; o token continua
-- escopado aos cards, mas precisa dizer para qual etapa ele vale.
alter table local_jobs
  add column if not exists kind text not null default 'architect',
  -- Cards que ja devolveram resultado neste lote. Sem isso o token aceita o mesmo
  -- card indefinidamente durante as 12h de validade, e um POST repetido depois de
  -- aprovado arrastaria o card de volta para fora de "em qa".
  add column if not exists received_ids text[] not null default '{}',
  -- Quem mencionar quando o revisor reprovar: as pessoas que atuam no projeto,
  -- nao so quem criou o card.
  add column if not exists mention_emails text[] not null default '{}';
