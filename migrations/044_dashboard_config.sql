-- Guarda o "snapshot" do separador Mapas do Dashboard Negócio: os totais
-- próprios do Zé (faturação, comissões, pontos, consultores mês a mês), o
-- mapa de comissões da folha (2019+), as outras contas e a escada/linhas de
-- patamar. São dados financeiros do Zé — não vivem no código (repositório
-- público), entram por /api/admin/dashboard-negocio/config. Um só registo,
-- por chave (ex.: 'mapas'), com o objeto todo em jsonb.
create table if not exists dashboard_config (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);
