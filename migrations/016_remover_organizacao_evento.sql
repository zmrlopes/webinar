-- A inscrição no evento deixou de pedir a organização — o admin já não
-- mostra gráfico nenhum por organização.
alter table evento_inscricoes drop column if exists organizacao;
