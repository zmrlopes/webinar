-- Aviso único à equipa de que as formações gravadas (/consultor/formacoes)
-- já estão no painel. Uma linha por pessoa avisada (com sucesso ou falha):
-- é o que deixa o envio andar por lotes e retomar a meio sem mandar o
-- email duas vezes a ninguém — o mesmo papel de notificacoes_equipa para
-- as sessões (ver src/lib/formacoes-aviso.ts).
create table if not exists avisos_formacoes (
  destinatario text primary key,
  sucesso      boolean not null,
  erro         text,
  enviado_em   timestamptz not null default now()
);
