-- Liga um código curto (a "referencia" já usada em ?ref=) ao email do
-- consultor, para o link de inscrição poder ser só "/joao-silva" em vez de
-- "/webinar/<uuid>?ref=joao-silva&refEmail=...". Uma linha por consultor —
-- pedir o link outra vez com o mesmo nome atualiza a mesma linha.
create table if not exists links_consultor (
  referencia       text primary key,
  referencia_email text not null,
  atualizado_em    timestamptz not null default now()
);
