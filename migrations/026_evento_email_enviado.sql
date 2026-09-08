-- Se o email de confirmação (com o QR code do bilhete) foi enviado com
-- sucesso — sem isto não havia forma de confirmar depois, mesmo com o
-- messageId do lado da Brevo. Fica a null para inscrições anteriores a
-- esta coluna, porque genuinamente não sabemos o que aconteceu com elas.
alter table evento_inscricoes
  add column if not exists email_enviado boolean;
