-- No máximo uma inscrição ativa por pessoa/sessão. Parcial (só entre as
-- não canceladas) para não impedir uma nova inscrição depois de a antiga
-- ter sido cancelada (ex: uma duplicada removida à mão).
--
-- Sem isto, dois cliques rápidos a seguir em "Entrar na formação" (ou
-- qualquer outro fluxo que verifica "já existe?" e só depois insere)
-- podiam criar duas linhas em simultâneo — foi assim que apareceram
-- inscrições duplicadas da mesma pessoa na mesma sessão.
create unique index if not exists registrations_webinar_email_ativa_idx
  on registrations (webinar_id, email)
  where cancelada_em is null;
