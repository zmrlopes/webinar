-- Base de conhecimento tirada das formações (Tropa de Elite no YouTube e
-- iCliGo Academy): uma linha por aula, com a transcrição e o conhecimento
-- destilado (princípios, frases-modelo, respostas a objeções, referências).
-- Usada pelo assistente de objeções e, mais tarde, como base para outras
-- tarefas. O conteúdo das formações é interno — vive só aqui, nunca no
-- código (o repositório é público). Entra por /api/admin/formacoes-conhecimento.
create table if not exists formacoes_conhecimento (
  id            text primary key,            -- ID do YouTube, ou "icligo-<slug>" da Academy
  fonte         text not null,               -- 'youtube' | 'academy'
  categoria     text,
  curso         text not null,
  modulo        text,
  titulo        text not null,
  formador      text,
  url           text,
  transcricao   text,
  resumo        text,
  temas         text[] not null default '{}',
  atualizado_em timestamptz not null default now()
);

create index if not exists formacoes_conhecimento_temas_idx
  on formacoes_conhecimento using gin (temas);
