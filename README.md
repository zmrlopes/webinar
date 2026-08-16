# webinar

Sistema de webinars, integrado com a sala partilhada de Zoom "Vão Quadrado"
(ver `GUIA-ZOOM-VAO-QUADRADO.md`, entregue à parte — não versionado por conter
uma credencial viva).

## Estado

Implementação por fases, seguindo a secção 14 do guia. Progresso:

- [x] **Fase 1** — chave no ambiente + cliente da API (`src/lib/sala-zoom.ts`) + testes 1-5
- [x] **Fase 2** — colunas novas na base de dados (`migrations/`)
- [ ] Fase 3 — sincronização de sessões
- [ ] Fase 4 — formulário grava e enfileira
- [ ] Fase 5 — fila dos links, com recuo crescente
- [ ] Fase 6 — email de confirmação
- [ ] Fase 7 — lembretes
- [ ] Fase 8 — presenças em lotes
- [ ] Fase 9 — limpeza dos links
- [ ] Fase 10 — ensaio de ponta a ponta

## Fase 1 — cliente da API e testes de aceitação

```bash
npm install
cp .env.example .env   # preencher SALA_API_KEY com a chave real (não versionar)
npm run test:fase1
```

`SALA_API_KEY` nunca deve ir para o repositório, para logs, nem para o bundle
do browser (sem prefixo `NEXT_PUBLIC_`). Em produção, define-a como variável
de ambiente do servidor na plataforma de deployment.

## Fase 2 — base de dados

`migrations/001_base_schema.sql` cria uma base mínima de `webinars` e
`registrations` — este repositório partia vazio, sem sistema de webinars
prévio. Se já tiveres essas tabelas noutro sítio com um esquema diferente,
ignora essa primeira migration e aplica só `002_sala_zoom.sql` (as colunas da
secção 6 do guia) à tua base real.

```bash
cp .env.example .env   # preencher também DATABASE_URL
npm run migrar
```

O runner (`scripts/migrar.ts`) aplica cada ficheiro de `migrations/` dentro de
uma transação e regista o que já correu em `schema_migrations`, por isso é
seguro correr repetidamente.
