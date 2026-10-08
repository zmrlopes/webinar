create table if not exists documentos_pastas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (nome = btrim(nome) and length(nome) between 1 and 150),
  criado_em timestamptz not null default now()
);
create unique index if not exists documentos_pastas_nome on documentos_pastas(lower(nome));
alter table documentos add column if not exists pasta_id uuid references documentos_pastas(id) on delete set null;
create index if not exists documentos_pasta on documentos(pasta_id);
insert into documentos_pastas(nome) values ('Congresso') on conflict (lower(nome)) do nothing;
update documentos set pasta_id = (select id from documentos_pastas where lower(nome) = 'congresso')
where pasta_id is null and categoria = 'Be a Leader Madrid 2026';
