create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  nome text not null,
  tipo text not null,
  categoria text not null default 'Geral',
  descricao text not null default '',
  tamanho bigint not null check (tamanho > 0 and tamanho <= 1073741824),
  publicado boolean not null default false,
  estado text not null default 'upload' check (estado in ('upload', 'pronto')),
  conhecimento_estado text not null default 'pendente' check (conhecimento_estado in ('pendente', 'indexado', 'sem-texto')),
  texto text not null default '',
  sha256 text,
  criado_em timestamptz not null default now()
);
create unique index if not exists documentos_sha256 on documentos(sha256) where sha256 is not null;
create table if not exists documentos_partes (
  documento_id uuid not null references documentos(id) on delete cascade,
  indice integer not null check (indice >= 0),
  bytes bytea not null check (octet_length(bytes) > 0 and octet_length(bytes) <= 1048576),
  primary key (documento_id, indice)
);
create table if not exists documentos_conhecimento (
  documento_id uuid not null references documentos(id) on delete cascade,
  indice integer not null,
  conteudo text not null,
  pesquisa tsvector generated always as (to_tsvector('simple', conteudo) || to_tsvector('portuguese', conteudo) || to_tsvector('english', conteudo)) stored,
  primary key (documento_id, indice)
);
create index if not exists documentos_conhecimento_pesquisa on documentos_conhecimento using gin(pesquisa);
