-- Última objeção descrita (e respostas geradas) para cada lead — para o
-- consultor voltar à tabela de leads e encontrar o que lá tinha posto,
-- mesmo depois de sair para responder à lead por WhatsApp/telefone.
create table if not exists objecoes_lead (
  lead_email    text primary key,
  objecao       text not null,
  respostas     jsonb not null,
  atualizado_em timestamptz not null default now()
);
