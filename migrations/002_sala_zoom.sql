-- Colunas para a integração da sala partilhada de Zoom (secção 6 do guia).

alter table webinars
  add column sessao_externa_id  text unique,   -- o `id` vindo do GET /sessoes
  add column sessao_externa_em  timestamptz,   -- o `comeca_em`, em UTC
  add column presencas_fechadas boolean not null default false;

create index webinars_sessao_externa_idx on webinars (sessao_externa_id);

alter table registrations
  add column link_pessoal        text,          -- credencial de entrada
  add column link_pedido_em      timestamptz,
  add column link_estado         text not null default 'pendente'
    check (link_estado in ('pendente','obtido','falhado')),
  add column link_tentativas     integer not null default 0,
  add column link_proxima_em     timestamptz,   -- quando repetir
  add column link_ultimo_erro    text,
  add column presenca            text not null default 'unknown'
    check (presenca in ('unknown','attended','absent')),
  add column presenca_minutos    integer;

-- O que a fila varre a cada ciclo.
create index registrations_link_pendente_idx
  on registrations (link_estado, link_proxima_em)
  where link_estado = 'pendente';
