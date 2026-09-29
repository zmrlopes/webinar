-- Histórico mensal do negócio (faturação, comissões, pontos, consultores),
-- por métrica/ano/mês. São os totais próprios do Zé, vindos do MyOffice e da
-- folha de comissões — não vivem no código (repositório público), entram
-- aqui pela importação em /admin/dashboard-negocio (ver a rota de API e
-- src/lib/dashboard-negocio.ts). Alimenta os cartões, os gráficos e as
-- projeções do separador Mapas.
create table if not exists negocio_mensal (
  metrica       text    not null,
  ano           integer not null,
  mes           integer not null check (mes between 1 and 12),
  valor         numeric not null,
  atualizado_em timestamptz not null default now(),
  primary key (metrica, ano, mes)
);
