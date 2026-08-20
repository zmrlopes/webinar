-- Guarda quando a pessoa aceitou a política de privacidade no formulário de
-- inscrição — null significa que nunca aceitou (não devia acontecer depois
-- desta migration, já que passa a ser obrigatório, mas fica registado o
-- momento exato para quem já se inscreveu antes desta mudança).
alter table registrations
  add column consentimento_privacidade_em timestamptz;
