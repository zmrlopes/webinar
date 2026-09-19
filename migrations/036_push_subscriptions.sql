-- Subscrições de notificações push do browser (Web Push), uma por
-- dispositivo/browser onde o consultor deu permissão — a mesma pessoa
-- pode ter várias (telemóvel + computador). `endpoint` é o identificador
-- único que o browser atribui a cada subscrição; guardamos as chaves
-- p256dh/auth tal como o PushManager as devolve, exigidas para cifrar cada
-- notificação (ver src/lib/push.ts). Sem tabela de "email" único porque um
-- email legitimamente tem várias subscrições ativas ao mesmo tempo.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  criado_em  timestamptz not null default now()
);

create index if not exists push_subscriptions_email_idx on push_subscriptions (email);
