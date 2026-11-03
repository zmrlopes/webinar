create table campanhas_email (
 id uuid primary key,
 assunto text not null,
 corpo text not null,
 listas text[] not null,
 agendado_em timestamptz not null,
 criado_em timestamptz not null default now(),
 cancelado_em timestamptz
);
create table campanhas_email_destinatarios (
 campanha_id uuid not null references campanhas_email(id),
 email text not null,
 estado text not null default 'pendente' check (estado in ('pendente','a_enviar','enviado','incerto')),
 iniciado_em timestamptz,
 enviado_em timestamptz,
 erro text,
 primary key (campanha_id,email)
);
create index campanhas_email_fila on campanhas_email_destinatarios (estado,campanha_id);
