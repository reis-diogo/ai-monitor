-- Defesa em profundidade: com RLS ligado e sem policy, a publishable/anon key
-- nao le nem escreve nada. O servidor usa a secret/service_role key, que passa
-- por cima de RLS — por isso RODE ISTO SO DEPOIS de SUPABASE_SECRET_KEY estar
-- com a secret key de verdade, aqui e na Vercel. Com a publishable key ainda
-- configurada, o app para de funcionar.

alter table repos enable row level security;
alter table projects enable row level security;
alter table professionals enable row level security;
alter table commit_cache enable row level security;
alter table analysis_cache enable row level security;
alter table project_analysis_cache enable row level security;
alter table ai_prompts enable row level security;
alter table local_jobs enable row level security;
