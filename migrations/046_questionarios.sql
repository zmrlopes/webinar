-- Questionários anónimos à equipa (separador "Questionários" no admin). As
-- perguntas vivem no código (src/lib/questionarios-lista.ts); aqui fica só o
-- estado de cada um e as respostas.
--
-- Anonimato: a resposta NÃO guarda email nem hora — só o dia. Quem já
-- respondeu fica numa tabela à parte, sem ligação à resposta, apenas para o
-- cartão deixar de aparecer e ninguém responder duas vezes. O painel mostra
-- as respostas por pergunta e baralhadas, sem nada que diga de quem são.
create table if not exists questionarios_estado (
  slug            text primary key,
  aberto          boolean not null default true,
  push_enviado_em timestamptz,
  criado_em       timestamptz not null default now()
);

create table if not exists questionario_respostas (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null references questionarios_estado(slug),
  respostas jsonb not null,
  dia       date not null default current_date
);
create index if not exists questionario_respostas_slug_idx on questionario_respostas (slug);

create table if not exists questionario_participacoes (
  slug  text not null references questionarios_estado(slug),
  email text not null,
  primary key (slug, email)
);

insert into questionarios_estado (slug) values ('equipa-outubro-2026') on conflict do nothing;
