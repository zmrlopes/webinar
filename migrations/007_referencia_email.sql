-- O `referencia` (secção "consultores") é só um código legível (slug); para
-- notificar o consultor sobre um lead novo precisamos do email dele, que o
-- link de inscrição passa a levar também (?ref=slug&refEmail=email).

alter table registrations
  add column referencia_email text;
