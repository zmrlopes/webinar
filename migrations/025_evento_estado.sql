-- Estado do Teambuilding (só uma linha) — se as inscrições ainda estão
-- abertas ou já foram encerradas. Ver estaoInscricoesAbertas/
-- definirInscricoesAbertas em src/lib/eventos.ts.
create table if not exists evento_estado (
  id                 integer primary key default 1,
  inscricoes_abertas boolean not null default true,
  check (id = 1)
);

-- Já nasce fechada — pedido explícito de encerrar as inscrições agora.
insert into evento_estado (id, inscricoes_abertas)
values (1, false)
on conflict (id) do nothing;
