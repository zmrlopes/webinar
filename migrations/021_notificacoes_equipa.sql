-- Registo de quem foi avisado (e se falhou) quando uma sessão nova fica
-- disponível — ver notificarEquipaNovaSessao em src/lib/email.ts. Sem isto
-- não havia como confirmar, mesmo horas depois, se o aviso saiu ou chegou
-- a alguém — só ficava num console.log/console.error que ninguém revê.

create table notificacoes_equipa (
  id           uuid primary key default gen_random_uuid(),
  webinar_id   uuid not null references webinars(id),
  destinatario text not null,
  sucesso      boolean not null,
  erro         text,
  enviado_em   timestamptz not null default now(),
  unique (webinar_id, destinatario)
);

create index notificacoes_equipa_webinar_id_idx on notificacoes_equipa (webinar_id);
