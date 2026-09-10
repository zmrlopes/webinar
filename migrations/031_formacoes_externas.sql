-- Formações de fora do sistema (ex: iCliGo) — só um link para fora, sem
-- inscrição nem email próprio, geridas à mão em /admin/formacoes-externas
-- porque ainda não há API do iCliGo para ir buscar isto sozinho.
create table if not exists formacoes_externas (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  sessao_externa_em timestamptz not null,
  link              text not null,
  criado_em         timestamptz not null default now()
);
