-- Ha quanto tempo cada card esta parado no status atual.
--
-- Nao da para deduzir isso de date_updated: qualquer edicao no card mexe nele, e o
-- numero mentiria para mais. A verdade esta no time_in_status do ClickUp, que custa
-- uma chamada por card — caro demais para o sync de 60s com 105 cards abertos.
--
-- Entao: o sync carimba since quando VE o status mudar, de graca, e a semeadura pelo
-- botao busca no ClickUp o valor real dos cards que ja estavam parados antes de
-- comecarmos a observar. since nulo significa "ainda nao sabemos" — a tela mostra
-- traco em vez de inventar um numero.
--
-- Sem RLS: a chave que o app usa no servidor e publishable e respeita RLS, entao
-- liga-la bloquearia a propria aplicacao.
create table if not exists status_dwell (
  task_id text primary key,
  status text not null,
  since timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists status_dwell_status_idx on status_dwell (status);
