-- Pontos de qualificação de patamar (coluna "points"/"ponts" no CSV da
-- plataforma de afiliados) — usados para ver se alguém que pediu um troféu
-- de patamar acima do seu está mesmo perto de lá chegar, em vez de ser
-- sempre tratado como engano. Ver src/lib/trofeus-lista.ts.
alter table equipa_afiliados add column if not exists pontos numeric;
