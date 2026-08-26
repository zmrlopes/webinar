-- Inscrições no evento "Teambuilding Tropa de Elite" (backoffice → separador
-- Eventos). Sem tabela de eventos genérica — é só este evento por agora; o
-- comprovativo de pagamento fica em bytea, na mesma base de dados, para não
-- depender de nenhum serviço de storage externo.
create table if not exists evento_inscricoes (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  telemovel         text not null,
  email             text not null,
  organizacao       text not null check (organizacao in ('Sara e Zé', 'Ana Custódia', 'Lara Rodrigues', 'Ludmila')),
  adultos           integer not null check (adultos >= 1),
  criancas_mais10   integer not null default 0 check (criancas_mais10 >= 0),
  criancas_menos10  integer not null default 0 check (criancas_menos10 >= 0),
  total_pagar       numeric(10,2) not null,
  comprovativo      bytea not null,
  comprovativo_nome text,
  comprovativo_tipo text,
  criado_em         timestamptz not null default now()
);
