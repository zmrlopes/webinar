update documentos_pastas set nome='Be a Leader 26'
where lower(nome) in ('congresso', 'be a leader madrid 26')
  and not exists (select 1 from documentos_pastas where lower(nome)='be a leader 26');
