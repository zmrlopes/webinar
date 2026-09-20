-- Questionário do hotel para o Teambuilding de 14 de novembro: quem quer
-- quarto no Aurea Fátima Hotel Congress & Spa, que tipo (Single ou
-- Duplo/Twin) e que noites — a Sara precisa disto para fechar a reserva
-- com o hotel. Só aparece a quem está inscrito no evento — ver o aviso em
-- /consultor e a listagem em /admin/hotel-respostas.
create table if not exists respostas_hotel (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  quer_quarto     boolean not null,
  tipo_quarto     text,
  noite_anterior  boolean not null default false,
  noite_seguinte  boolean not null default false,
  criado_em       timestamptz not null default now(),
  constraint respostas_hotel_tipo_quarto_check
    check (tipo_quarto is null or tipo_quarto in ('single', 'duplo'))
);
