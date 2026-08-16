-- Registo do que já foi enviado, para nunca disparar duas vezes o mesmo
-- email por causa de um ciclo da fila reprocessar a mesma linha.

create table emails (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id),
  tipo            text not null check (tipo in ('confirmacao', 'lembrete')),
  enviado_em      timestamptz not null default now(),
  unique (registration_id, tipo)
);
