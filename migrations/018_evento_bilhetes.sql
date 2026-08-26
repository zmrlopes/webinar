-- Cada inscrição pode ter várias pessoas (adultos + crianças que pagam);
-- cada uma tem o seu próprio bilhete/QR code e presença própria — substitui
-- a presença única por inscrição da migração 017.
create table if not exists evento_bilhetes (
  id           uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references evento_inscricoes(id) on delete cascade,
  rotulo       text not null,
  presente     boolean not null default false,
  presente_em  timestamptz
);

alter table evento_inscricoes
  drop column if exists presente,
  drop column if exists presente_em;
