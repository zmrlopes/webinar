-- Documentos guardados junto do evento (relatórios, programas, listas) — para
-- estar tudo no mesmo sítio em /admin/eventos, em vez de espalhado pelo email
-- e pelo computador de quem organiza.
create table if not exists evento_documentos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  tipo      text not null,
  bytes     bytea not null,
  criado_em timestamptz not null default now()
);
