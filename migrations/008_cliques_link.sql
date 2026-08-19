-- "Aberturas do link": quantas vezes a página de inscrição foi aberta a
-- partir do link de um consultor, antes de a pessoa chegar a inscrever-se.
-- Só regista quando há refEmail (link identificado a um consultor) — uma
-- visita sem link de consultor não é uma "abertura" de ninguém.
create table if not exists cliques_link (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references webinars(id),
  referencia_email text not null,
  criado_em timestamptz not null default now()
);

create index if not exists cliques_link_consultor_idx
  on cliques_link (webinar_id, referencia_email);
