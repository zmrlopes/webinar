-- Nome do consultor, guardado no mesmo momento em que o link é gerado
-- (POST /api/consultor/link), para mostrar "Convite de <nome>" no cartão de
-- inscrição sem precisar de chamar a Brevo outra vez em cada visita.
alter table links_consultor
  add column nome text;
