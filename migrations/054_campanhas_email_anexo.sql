alter table campanhas_email
 add column anexo_nome text,
 add column anexo_tipo text,
 add column anexo bytea;
alter table campanhas_email add constraint campanhas_email_anexo_valido check (
 (anexo is null and anexo_nome is null and anexo_tipo is null)
 or (anexo is not null and anexo_nome is not null and anexo_tipo is not null
     and octet_length(anexo) between 1 and 3145728)
);
