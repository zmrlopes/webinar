-- Campanhas para os inscritos no evento podem levar, a cada pessoa, os QR
-- codes dos seus próprios bilhetes (além do anexo comum, igual para todos).
alter table campanhas_email
 add column if not exists anexar_qr_evento boolean not null default false;
