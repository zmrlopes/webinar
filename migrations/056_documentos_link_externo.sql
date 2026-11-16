-- Um "documento" pode agora ser uma ligação externa em vez de um ficheiro
-- enviado (por exemplo, a pasta de fotos de um evento num serviço à
-- parte, como o álbum do Teambuilding de novembro). Fica pronto e
-- publicado na hora, sem passar pelo fluxo de upload por partes.
alter table documentos add column if not exists link_externo text
  check (link_externo is null or (length(link_externo) <= 2000 and link_externo ~ '^https://'));

-- A constraint antiga (tamanho > 0) é largada pelo conteúdo, não pelo
-- nome: o nome que o Postgres lhe deu ao criar a tabela (047_documentos.sql)
-- é previsível mas não garantido.
do $$
declare
  nome text;
begin
  for nome in
    select con.conname
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    where cls.relname = 'documentos'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%tamanho%'
  loop
    execute format('alter table documentos drop constraint %I', nome);
  end loop;
end $$;

alter table documentos add constraint documentos_tamanho_check
  check (
    (link_externo is null and tamanho > 0 and tamanho <= 1073741824)
    or (link_externo is not null and tamanho = 0)
  );
