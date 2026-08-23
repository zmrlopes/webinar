-- Marca quando alguém clica no link de entrada do Zoom que recebeu por
-- email — o link deixa de apontar direto para o Zoom e passa por
-- /api/entrar/<id>, que regista o clique e só depois redireciona.
alter table registrations add column link_zoom_clicado_em timestamptz;
