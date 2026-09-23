-- Formações gravadas (/consultor/formacoes): cada consultor marca as aulas
-- que já viu. `aula_id` é o id da aula em src/lib/formacoes-gravadas.ts (o
-- ID do vídeo do YouTube, ou um id gerado quando a aula ainda não tem vídeo),
-- não uma chave estrangeira — as formações vivem no código, não na base de dados.
create table if not exists formacoes_vistas (
  email     text not null,
  aula_id   text not null,
  vista_em  timestamptz not null default now(),
  primary key (email, aula_id)
);
