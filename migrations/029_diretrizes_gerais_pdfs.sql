-- Os PDFs passam a estar ligados às diretrizes gerais (sempre incluídos),
-- não ao conhecimento por tema — por isso saem de conhecimento_objecoes e
-- ganham a sua própria tabela, com vários PDFs possíveis.
alter table conhecimento_objecoes
  drop column if exists pdf_nome,
  drop column if exists pdf_bytes;

create table if not exists objecoes_diretrizes_pdfs (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  texto     text not null,
  bytes     bytea not null,
  criado_em timestamptz not null default now()
);
