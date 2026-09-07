-- Base de conhecimento para o assistente de objeções (painel do consultor)
-- — cada entrada é uma diretriz, exemplo ou referência que o admin vai
-- adicionando; todas são passadas ao modelo como contexto ao gerar
-- hipóteses de resposta a uma objeção. Ver src/lib/objecoes.ts.
create table if not exists conhecimento_objecoes (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  conteudo   text not null,
  criado_em  timestamptz not null default now()
);
