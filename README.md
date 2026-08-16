# webinar

Sistema de webinars, integrado com a sala partilhada de Zoom "Vão Quadrado"
(ver `GUIA-ZOOM-VAO-QUADRADO.md`, entregue à parte — não versionado por conter
uma credencial viva).

## Estado

Implementação por fases, seguindo a secção 14 do guia. Progresso:

- [x] **Fase 1** — chave no ambiente + cliente da API (`src/lib/sala-zoom.ts`) + testes 1-5
- [ ] Fase 2 — colunas novas na base de dados
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
