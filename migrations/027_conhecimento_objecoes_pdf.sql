-- Permite anexar um PDF a uma entrada de conhecimento — o texto é extraído
-- e guardado em `conteudo` (o que o assistente lê), o ficheiro original fica
-- aqui só para o admin poder voltar a abri-lo depois.
alter table conhecimento_objecoes
  add column if not exists pdf_nome text,
  add column if not exists pdf_bytes bytea;
