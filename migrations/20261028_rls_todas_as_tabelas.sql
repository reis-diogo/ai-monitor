-- Liga o RLS em toda tabela do schema public que ainda esteja sem ele. Sem policy,
-- a publishable/anon key nao le nem escreve nada; o servidor usa a secret key, que
-- passa por cima de RLS, entao o app segue funcionando igual.
--
-- Motivo: o Realtime (mouses de quem esta na pagina) roda no navegador e leva a
-- publishable key para o bundle. Antes disso, nenhuma tabela pode responder a ela.
-- Rode ANTES de publicar a tela com o Realtime. Pode rodar mais de uma vez.
-- So rode com SUPABASE_SECRET_KEY configurada com a secret key de verdade, aqui e
-- na Vercel: com a publishable key no servidor, o app para de funcionar.

do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and rowsecurity = false
  loop
    execute format('alter table %I.%I enable row level security', item.schemaname, item.tablename);
    raise notice 'RLS ligado em %.%', item.schemaname, item.tablename;
  end loop;
end
$$;

-- Conferencia: deve devolver zero linhas.
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false;
