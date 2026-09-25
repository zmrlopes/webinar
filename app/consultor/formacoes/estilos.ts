/** CSS partilhado pelas páginas de formações gravadas (mesmo estilo do resto do painel do consultor). */
export const ESTILOS_FORMACOES = `
  .vqf-pagina {
    background: #ffffff;
    color: #000000;
    margin: 0;
    padding: 2.5rem 1.25rem 4rem;
    min-height: calc(100vh - 4rem);
  }
  .vqf-caixa { max-width: 1100px; margin: 0 auto; }
  .vqf-pagina h1 { color: #000000; font-size: 1.6rem; margin: 0.6rem 0 0.4rem; }
  .vqf-pagina h2 { color: #4b5320; font-size: 1.15rem; margin: 2rem 0 0.6rem; }
  .vqf-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
  .vqf-voltar:hover { text-decoration: underline; }
  .vqf-mudo { color: #6b6a63; font-size: 0.9rem; margin: 0 0 1.25rem; }
  .vqf-erro { color: #b3261e; margin: 0.75rem 0 0; font-size: 0.9rem; }

  .vqf-pagina .vqf-botao {
    display: block;
    box-sizing: border-box;
    width: 100%;
    text-align: center;
    background: linear-gradient(135deg, #5d6b2a, #4b5320);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 0.85rem;
    font-size: 1.05rem;
    font-weight: 700;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
  }
  .vqf-pagina .vqf-botao-desativado {
    background: #d9d9d9;
    color: #6b6a63;
    cursor: default;
  }

  .vqf-grade-categorias {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .vqf-cartao {
    background: #f7f6f3;
    border: 1px solid #000000;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
  }
  .vqf-cartao h2 { color: #000000; font-size: 1.25rem; margin: 0 0 0.4rem; }
  .vqf-cartao p { margin: 0 0 1rem; color: #6b6a63; font-size: 0.9rem; }
  .vqf-cartao p.vqf-cartao-meta { color: #4b5320; font-weight: 700; font-size: 0.8rem; }
  .vqf-cartao .vqf-botao { margin-top: auto; }

  .vqf-separadores {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.25rem;
    border-bottom: 1px solid #d9d9d9;
  }
  .vqf-pagina button.vqf-separador {
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    margin-bottom: -1px;
    padding: 0.6rem 1rem;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: inherit;
    color: #6b6a63;
    cursor: pointer;
  }
  .vqf-pagina button.vqf-separador-ativo { color: #4b5320; border-bottom-color: #4b5320; }

  .vqf-topo-progresso { margin: 1.25rem 0 0; }
  .vqf-barra { height: 8px; background: #e6e4dc; border-radius: 999px; overflow: hidden; }
  .vqf-barra-cheia { height: 100%; background: #4b5320; border-radius: 999px; transition: width 0.2s; }
  .vqf-progresso-texto { font-size: 0.85rem; color: #6b6a63; margin: 0.4rem 0 0; }

  .vqf-pesquisa {
    display: block;
    box-sizing: border-box;
    width: 100%;
    margin-top: 1.25rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid #000000;
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    background: #ffffff;
    color: #000000;
  }

  .vqf-aulas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }
  .vqf-aula {
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 12px;
    overflow: hidden;
  }
  .vqf-aula-vista { border-color: #1e7a34; }
  .vqf-capa {
    position: relative;
    display: block;
    aspect-ratio: 16 / 9;
    background: #1c1c1c;
    color: #ffffff;
    text-decoration: none;
  }
  .vqf-capa img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .vqf-capa-vazia {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ece9e0;
    color: #6b6a63;
    font-size: 0.85rem;
    font-weight: 700;
  }
  .vqf-play {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    padding-left: 0.15rem;
    box-sizing: border-box;
  }
  .vqf-capa:hover .vqf-play { background: #4b5320; }
  .vqf-min {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    background: rgba(0, 0, 0, 0.75);
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }
  .vqf-badge-vista {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    background: #1e7a34;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }
  .vqf-aula-corpo { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.75rem 0.85rem 0.85rem; flex: 1; }
  .vqf-aula-etiqueta { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #4b5320; margin: 0; }
  .vqf-aula-titulo { font-size: 0.92rem; font-weight: 600; line-height: 1.3; margin: 0; color: #000000; }
  .vqf-aula-sub { font-size: 0.8rem; color: #6b6a63; margin: 0; }
  .vqf-pagina .vqf-marcar {
    margin-top: auto;
    align-self: flex-start;
    background: none;
    border: 1px solid #4b5320;
    color: #4b5320;
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
  }
  .vqf-pagina a.vqf-link-externo { text-decoration: none; }
  .vqf-capa-externa { background: #ece9e0; }
  .vqf-pagina button.vqf-marcar-feito { background: #4b5320; color: #ffffff; }

  .vqf-curso {
    margin-top: 1rem;
    background: #f7f6f3;
    border: 1px solid #000000;
    border-radius: 12px;
  }
  .vqf-curso > summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
  }
  .vqf-curso > summary::-webkit-details-marker { display: none; }
  .vqf-curso-numero {
    flex: none;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    background: #4b5320;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  .vqf-curso-texto { flex: 1; min-width: 0; }
  .vqf-curso-titulo { font-size: 1.05rem; font-weight: 700; margin: 0; color: #000000; }
  .vqf-curso-descricao { font-size: 0.85rem; color: #6b6a63; margin: 0.2rem 0 0.5rem; }
  .vqf-curso-seta { flex: none; color: #4b5320; font-weight: 700; transition: transform 0.15s; }
  .vqf-curso[open] .vqf-curso-seta { transform: rotate(90deg); }
  .vqf-curso-corpo { padding: 0 1.25rem 1.25rem; }

  .vqf-modulo {
    margin-top: 1rem;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 10px;
  }
  .vqf-modulo:first-child { margin-top: 0; }
  .vqf-modulo-summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }
  .vqf-modulo-summary::-webkit-details-marker { display: none; }
  .vqf-modulo-titulo { flex: 1; min-width: 0; font-size: 0.9rem; font-weight: 700; color: #000000; }
  .vqf-modulo-meta { font-size: 0.8rem; color: #6b6a63; white-space: nowrap; }
  .vqf-modulo-seta { color: #4b5320; font-weight: 700; transition: transform 0.15s; flex: none; }
  .vqf-modulo[open] .vqf-modulo-seta { transform: rotate(90deg); }
  .vqf-modulo .vqf-aulas { padding: 0 1rem 1rem; }

  .vqf-pagina h3.vqf-subtitulo { color: #000000; font-size: 1rem; margin: 1.5rem 0 0.6rem; }

  .vqf-curso-capa {
    flex: none;
    width: 6.5rem;
    aspect-ratio: 2 / 1;
    object-fit: cover;
    border-radius: 6px;
    background: #ece9e0;
  }
  .vqf-curso-corpo > .vqf-link-externo { display: inline-block; margin-bottom: 1rem; }

  .vqf-licoes { list-style: none; margin: 0; padding: 0 1rem 0.75rem; }
  .vqf-licoes-caixa { padding: 0.25rem 1rem; border: 1px solid #d9d9d9; border-radius: 10px; background: #ffffff; }
  .vqf-licoes li + li { border-top: 1px solid #ece9e0; }
  .vqf-licao {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0;
    color: #000000;
    text-decoration: none;
  }
  .vqf-licao:hover .vqf-licao-titulo { text-decoration: underline; }
  .vqf-licao-texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
  .vqf-licao-titulo { font-size: 0.9rem; font-weight: 600; }
  .vqf-licao-contexto { font-size: 0.78rem; color: #6b6a63; }
  .vqf-licao-seta { flex: none; color: #4b5320; font-weight: 700; }

  @media (max-width: 520px) {
    .vqf-curso-capa { width: 4.5rem; }
    .vqf-pagina { padding: 1.5rem 0.9rem 3rem; }
    .vqf-aulas { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .vqf-curso > summary { padding: 0.9rem; gap: 0.75rem; }
    .vqf-curso-corpo { padding: 0 0.9rem 1rem; }
  }
`;
