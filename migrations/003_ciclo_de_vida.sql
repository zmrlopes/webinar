-- Campos de ciclo de vida que a secção 6 do guia não cobre (porque assume um
-- sistema de webinars já existente): duração, para calcular o fim previsto de
-- cada sessão, e marcadores de cancelamento.

alter table webinars
  add column duracao_minutos integer,
  add column cancelada_em    timestamptz;

alter table registrations
  add column cancelada_em timestamptz;
