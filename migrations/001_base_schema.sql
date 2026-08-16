-- Base mínima de webinars e inscrições, para a integração da sala partilhada
-- de Zoom ter tabelas a que se agarrar. Ajusta/substitui se já tiveres um
-- esquema próprio noutro sítio.

create extension if not exists pgcrypto;

create table webinars (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  criado_em  timestamptz not null default now()
);

create table registrations (
  id          uuid primary key default gen_random_uuid(),
  webinar_id  uuid not null references webinars(id),
  nome        text not null,
  apelido     text not null default '',
  email       text not null,
  criado_em   timestamptz not null default now()
);

create index registrations_webinar_id_idx on registrations (webinar_id);
create index registrations_email_idx on registrations (email);
