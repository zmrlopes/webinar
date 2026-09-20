-- A Sara também precisa de saber se alguém leva crianças para o quarto do
-- hotel, e as idades delas (afeta camas extra / crianças grátis conforme a
-- política do hotel) — ver src/lib/hotel.ts e /admin/hotel-respostas.
alter table respostas_hotel
  add column if not exists tem_criancas boolean not null default false,
  add column if not exists idades_criancas text;
