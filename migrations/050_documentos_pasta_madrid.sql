update documentos_pastas set nome='Be a Leader Madrid 26'
where lower(nome)='congresso'
  and not exists (select 1 from documentos_pastas where lower(nome)='be a leader madrid 26');
