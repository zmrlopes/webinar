-- A notificação da app passa a sair independentemente do email (antes só
-- era tentada depois de o email ter ido, portanto quem falhava o email
-- ficava sem aviso nenhum). Como o lembrete é reprocessado pelo cron de
-- 15 em 15 minutos enquanto o email falhar, a notificação precisa de
-- registo próprio aqui — senão repetia-se a cada nova tentativa.
--
-- A constraint antiga é largada pelo que é, não pelo nome: o nome que o
-- Postgres lhe deu ao criar a tabela (004_emails.sql) é previsível mas
-- não garantido, e deixá-la para trás por engano faria falhar todos os
-- registos novos — ou seja, partia os lembretes.
do $$
declare
  nome text;
begin
  for nome in
    select con.conname
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    where cls.relname = 'emails'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%tipo%'
  loop
    execute format('alter table emails drop constraint %I', nome);
  end loop;
end $$;

alter table emails add constraint emails_tipo_check
  check (tipo in ('confirmacao', 'lembrete', 'push-confirmacao', 'push-lembrete'));
