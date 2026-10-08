-- NULL mantém a visibilidade habitual; uma lista limita a formação aos emails escolhidos.
alter table webinars add column destinatarios_emails text[];

alter table webinars add constraint webinars_destinatarios_validos check (
  destinatarios_emails is null or (
    tipo = 'formacao' and not publico_para_leads
    and cardinality(destinatarios_emails) > 0
    and array_position(destinatarios_emails, null) is null
  )
);
