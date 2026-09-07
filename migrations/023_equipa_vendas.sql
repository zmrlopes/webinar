-- Volume de faturação própria de cada consultor (coluna "sales" do CSV da
-- plataforma de afiliados) — usado na tabela de patamar/faturação dos
-- inscritos no Teambuilding (ver src/lib/teambuilding.ts). Só fica
-- preenchida depois de reimportar o CSV com esta coluna já reconhecida
-- (scripts/importar-equipa.ts / /admin/equipa/importar).
alter table equipa_afiliados
  add column if not exists vendas numeric;
