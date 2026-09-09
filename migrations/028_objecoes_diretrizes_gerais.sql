-- Diretrizes gerais do assistente de objeções — texto único (linha id=1),
-- sempre incluído nas respostas, ao contrário do conhecimento por tema em
-- conhecimento_objecoes (que só entra quando o tema bate certo com a dúvida).
create table if not exists objecoes_diretrizes_gerais (
  id       integer primary key default 1,
  conteudo text not null default '',
  check (id = 1)
);

insert into objecoes_diretrizes_gerais (id, conteudo)
values (1, '')
on conflict (id) do nothing;
