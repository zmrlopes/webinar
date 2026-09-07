-- Respostas ao formulário de preparação do Teambuilding de 14 de novembro
-- — ver o aviso em /consultor (só para quem está inscrito no evento) e
-- /admin/teambuilding-respostas. O email fica guardado (nunca mostrado nas
-- respostas em si) só para não deixar responder duas vezes e para o admin
-- ver quem ainda falta responder.
create table if not exists respostas_teambuilding (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  expectativa         text not null,
  formacoes_desejadas text not null,
  duvidas             text,
  outros              text,
  criado_em           timestamptz not null default now()
);
