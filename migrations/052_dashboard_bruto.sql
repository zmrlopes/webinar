-- Respostas do MyOffice recebidas pelo botão «Atualizar dashboard» (ver
-- src/lib/dashboard-sincronizar.ts), guardadas tal como vieram. É a partir
-- delas que se recalculam os separadores do Dashboard Negócio. Têm nomes e
-- faturação de pessoas, por isso vivem só aqui, nunca no código público.
create table if not exists dashboard_bruto (
  chave       text primary key,
  corpo       jsonb not null,
  recebido_em timestamptz not null default now()
);
