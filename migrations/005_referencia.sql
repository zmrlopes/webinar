-- Código de referência do consultor (secção "página de consultores"),
-- capturado no ?ref= do link de inscrição. Nulo para quem se inscreve sem
-- vir por um link de consultor.

alter table registrations
  add column referencia text;

create index registrations_referencia_idx on registrations (referencia);
