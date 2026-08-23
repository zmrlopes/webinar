-- Hierarquia de equipa (upline/downline), importada do CSV exportado da
-- plataforma de afiliados. Alimenta a secção "A minha equipa" no painel do
-- consultor: quem está abaixo de quem, para agregar leads de toda a equipa
-- descendente, não só as próprias. Atualizada por scripts/importar-equipa.ts,
-- não por nada dentro da aplicação.
create table if not exists equipa_afiliados (
  email          text primary key,
  nome           text not null,
  upline_email   text,
  nivel          text,
  estado         text not null default 'ACTIVE',
  atualizado_em  timestamptz not null default now()
);

create index if not exists equipa_afiliados_upline_email_idx
  on equipa_afiliados (upline_email);
