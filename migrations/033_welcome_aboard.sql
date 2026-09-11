-- Data de registo (do CSV da equipa, coluna User_creation_date) e o
-- progresso nas duas sessões de "Welcome Aboard" — temporário, até o
-- Patrick construir isto por API do lado dele. Vive em equipa_afiliados
-- porque é 1:1 com a pessoa, sem necessidade de tabela própria.
alter table equipa_afiliados
  add column if not exists data_registo date,
  add column if not exists welcome_aboard_sessao1 boolean not null default false,
  add column if not exists welcome_aboard_sessao2 boolean not null default false;
