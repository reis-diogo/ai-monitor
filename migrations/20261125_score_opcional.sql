-- Card que entra pela esteira do P.O. nunca passa pela analise de qualidade: ela e de
-- outro fluxo. Guardar 0 ali afirmaria que o card foi avaliado e tirou nota zero, o
-- que e diferente de nao ter sido avaliado.
alter table analysis_cache alter column score drop not null;
