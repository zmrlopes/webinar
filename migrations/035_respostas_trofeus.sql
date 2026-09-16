-- Questionário dos troféus a entregar no Teambuilding de 14 de novembro:
-- quais é que cada consultor quer receber e quais já tem em casa (para não
-- se mandar fazer um troféu a dobrar). Só aparece a quem está inscrito no
-- evento — ver o aviso em /consultor e a contagem em /admin/trofeus-respostas.
--
-- As escolhas ficam em arrays de texto com as chaves definidas em
-- src/lib/trofeus.ts (patamar-junior, faturacao-100k, ...) em vez de uma
-- coluna por troféu: a lista ainda pode mudar antes do evento, e assim
-- acrescentar ou tirar um troféu não obriga a mexer na base de dados.
create table if not exists respostas_trofeus (
  id        uuid primary key default gen_random_uuid(),
  email     text not null unique,
  quero     text[] not null default '{}',
  ja_tenho  text[] not null default '{}',
  criado_em timestamptz not null default now()
);
