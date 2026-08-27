-- Formações ad-hoc criadas pelo admin (na conta Zoom própria, não na sala
-- partilhada do Patrick) — ver criarFormacao() em src/lib/webinars.ts.
-- `tipo` distingue estas de sessões sincronizadas da sala partilhada;
-- `link_zoom` é o link colado à mão, usado em vez de pedir um link pessoal
-- à API do Patrick; `publico_para_leads` decide se a formação também fica
-- disponível para inscrição pública (como o webinar) ou só para a equipa.
alter table webinars
  add column if not exists tipo text not null default 'sincronizado',
  add column if not exists link_zoom text,
  add column if not exists publico_para_leads boolean not null default false;

alter table webinars
  drop constraint if exists webinars_tipo_check;
alter table webinars
  add constraint webinars_tipo_check check (tipo in ('sincronizado', 'formacao'));
