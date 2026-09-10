-- Correção manual do "assistiu" — a sala Zoom partilhada do Patrick por
-- vezes marca presença errada (ou não marca nenhuma). Uma correção manual
-- aqui tem sempre prioridade sobre o cálculo automático a partir de
-- registrations.presenca (ver listarLeadsConsolidado em src/lib/leads.ts).
create table if not exists presenca_manual_lead (
  lead_email     text primary key,
  assistiu       boolean not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por text not null
);
