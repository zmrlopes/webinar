-- Presença no evento, confirmada por QR code (ver /api/eventos/checkin/[id]).
alter table evento_inscricoes
  add column if not exists presente    boolean not null default false,
  add column if not exists presente_em timestamptz;
