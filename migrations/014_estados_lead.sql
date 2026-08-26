-- Estado do funil comercial (follow up / convertido / desistiu) — uma
-- etiqueta por pessoa (email do lead), independente de quantas sessões
-- fez. "assistiu" não vive aqui — é sempre calculado a partir de
-- registrations.presenca, nunca guardado.
create table if not exists estados_lead (
  lead_email     text primary key,
  estado         text not null check (estado in ('follow_up', 'convertido', 'desistiu')),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text not null
);
