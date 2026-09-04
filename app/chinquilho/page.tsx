"use client";

import { useEffect, useState } from "react";

type Jogador = { id: string; nome: string };
type Jogada = { jogadorId: string; pontos: number };

type EstadoGuardado = { jogadores: Jogador[]; jogadas: Jogada[] };

const CHAVE_ARMAZENAMENTO = "chinquilho-finlandes-jogo";
const PONTOS_PARA_VENCER = 50;
const PONTOS_APOS_ULTRAPASSAR = 25;
const FALHAS_PARA_ELIMINAR = 3;

function novoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function calcularEstado(jogadores: Jogador[], jogadas: Jogada[]) {
  const pontuacoes = new Map<string, number>();
  const falhasSeguidas = new Map<string, number>();
  const eliminado = new Map<string, boolean>();
  for (const j of jogadores) {
    pontuacoes.set(j.id, 0);
    falhasSeguidas.set(j.id, 0);
    eliminado.set(j.id, false);
  }

  for (const jogada of jogadas) {
    if (jogada.pontos === 0) {
      const falhas = (falhasSeguidas.get(jogada.jogadorId) ?? 0) + 1;
      falhasSeguidas.set(jogada.jogadorId, falhas);
      if (falhas >= FALHAS_PARA_ELIMINAR) {
        eliminado.set(jogada.jogadorId, true);
      }
    } else {
      falhasSeguidas.set(jogada.jogadorId, 0);
      const total = (pontuacoes.get(jogada.jogadorId) ?? 0) + jogada.pontos;
      pontuacoes.set(jogada.jogadorId, total > PONTOS_PARA_VENCER ? PONTOS_APOS_ULTRAPASSAR : total);
    }
  }

  const ativos = jogadores.filter((j) => !eliminado.get(j.id));
  const vencedor = jogadores.find((j) => pontuacoes.get(j.id) === PONTOS_PARA_VENCER) ?? null;
  const jogoSemVencedor = !vencedor && jogadores.length > 0 && ativos.length === 0;

  let proximoJogador: Jogador | null = null;
  if (!vencedor && ativos.length > 0) {
    if (jogadas.length === 0) {
      proximoJogador = ativos[0] ?? null;
    } else {
      const ultimaJogada = jogadas[jogadas.length - 1]!;
      const indiceUltimo = jogadores.findIndex((j) => j.id === ultimaJogada.jogadorId);
      for (let i = 1; i <= jogadores.length; i++) {
        const candidato = jogadores[(indiceUltimo + i) % jogadores.length]!;
        if (!eliminado.get(candidato.id)) {
          proximoJogador = candidato;
          break;
        }
      }
    }
  }

  return { pontuacoes, falhasSeguidas, eliminado, vencedor, jogoSemVencedor, proximoJogador };
}

export default function PaginaChinquilho() {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [jogadas, setJogadas] = useState<Jogada[]>([]);
  const [emJogo, setEmJogo] = useState(false);
  const [nomeNovoJogador, setNomeNovoJogador] = useState("");
  const [mostrarRegras, setMostrarRegras] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (guardado) {
        const estado = JSON.parse(guardado) as EstadoGuardado & { emJogo?: boolean };
        setJogadores(estado.jogadores ?? []);
        setJogadas(estado.jogadas ?? []);
        setEmJogo(Boolean(estado.emJogo));
      }
    } catch {
      // localStorage indisponível ou dados inválidos: começa do zero
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(
        CHAVE_ARMAZENAMENTO,
        JSON.stringify({ jogadores, jogadas, emJogo })
      );
    } catch {
      // ignora falhas ao guardar
    }
  }, [jogadores, jogadas, emJogo, carregado]);

  function adicionarJogador() {
    const nome = nomeNovoJogador.trim();
    if (!nome) return;
    setJogadores((atual) => [...atual, { id: novoId(), nome }]);
    setNomeNovoJogador("");
  }

  function removerJogador(id: string) {
    setJogadores((atual) => atual.filter((j) => j.id !== id));
  }

  function comecarJogo() {
    if (jogadores.length < 1) return;
    setJogadas([]);
    setEmJogo(true);
  }

  function registarPontos(jogadorId: string, pontos: number) {
    setJogadas((atual) => [...atual, { jogadorId, pontos }]);
  }

  function desfazerUltimaJogada() {
    setJogadas((atual) => atual.slice(0, -1));
  }

  function novoJogoMesmosJogadores() {
    setJogadas([]);
    setEmJogo(true);
  }

  function terminarEVoltarAoInicio() {
    setEmJogo(false);
    setJogadas([]);
    setJogadores([]);
  }

  if (!carregado) return null;

  const { pontuacoes, falhasSeguidas, eliminado, vencedor, jogoSemVencedor, proximoJogador } =
    calcularEstado(jogadores, jogadas);

  return (
    <main>
      <h1>Chinquilho Finlandês</h1>
      <p className="mudo">Marcador para o jogo de precisão com os pinos numerados de 1 a 12.</p>

      <button
        type="button"
        className="botao-secundario"
        onClick={() => setMostrarRegras((v) => !v)}
      >
        {mostrarRegras ? "Esconder regras" : "Ver regras do jogo"}
      </button>

      {mostrarRegras && (
        <div className="cartao">
          <h2>Regras resumidas</h2>
          <ul>
            <li>
              Os 12 pinos, numerados de 1 a 12, começam agrupados numa formação fixa a cerca de
              3,5 m da linha de lançamento.
            </li>
            <li>Os jogadores lançam, à vez, um pino de madeira para derrubar os pinos numerados.</li>
            <li>
              <strong>Se derrubar apenas um pino</strong>, ganha os pontos correspondentes ao
              número desse pino.
            </li>
            <li>
              <strong>Se derrubar dois ou mais pinos</strong> no mesmo lançamento, ganha 1 ponto
              por cada pino derrubado (não conta o valor deles).
            </li>
            <li>Um pino só conta como derrubado se ficar completamente deitado no chão.</li>
            <li>
              Depois de cada lançamento, os pinos derrubados voltam a levantar-se exatamente no
              sítio onde caíram — o jogo fica mais estratégico à medida que se espalham.
            </li>
            <li>
              Se um jogador falhar todos os pinos <strong>3 vezes seguidas</strong>, é eliminado
              do jogo.
            </li>
            <li>
              Ganha quem chegar exatamente aos <strong>50 pontos</strong>. Quem ultrapassar os 50
              vê a pontuação descer para 25.
            </li>
          </ul>
          <p className="mudo">
            Nesta app, cada lançamento introduz-se com um único valor de 0 a 12 (0 = falhou), que
            já funciona para ambos os casos: pino único ou vários pinos derrubados.
          </p>
        </div>
      )}

      {!emJogo && (
        <div className="cartao">
          <h2>Jogadores</h2>
          <label htmlFor="nome-jogador">Nome do jogador</label>
          <input
            id="nome-jogador"
            value={nomeNovoJogador}
            onChange={(e) => setNomeNovoJogador(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarJogador();
              }
            }}
            placeholder="Ex.: Ana"
          />
          <button type="button" onClick={adicionarJogador}>
            Adicionar jogador
          </button>

          {jogadores.length > 0 && (
            <ol style={{ marginTop: "1.5rem", paddingLeft: "1.25rem" }}>
              {jogadores.map((j) => (
                <li key={j.id} style={{ marginBottom: "0.5rem" }}>
                  {j.nome}{" "}
                  <button
                    type="button"
                    className="botao-remover"
                    onClick={() => removerJogador(j.id)}
                  >
                    remover
                  </button>
                </li>
              ))}
            </ol>
          )}

          <button type="button" onClick={comecarJogo} disabled={jogadores.length < 1}>
            Começar jogo
          </button>
          {jogadores.length < 2 && (
            <p className="mudo">Normalmente joga-se com 2 ou mais jogadores.</p>
          )}
        </div>
      )}

      {emJogo && (
        <>
          {vencedor && (
            <div className="cartao sucesso">
              <h2>🏆 {vencedor.nome} venceu!</h2>
              <p className="mudo">Chegou aos {PONTOS_PARA_VENCER} pontos exatos.</p>
            </div>
          )}

          {jogoSemVencedor && (
            <div className="cartao">
              <h2>Jogo terminado sem vencedor</h2>
              <p className="mudo">Todos os jogadores foram eliminados por 3 falhas seguidas.</p>
            </div>
          )}

          <div className="cartao">
            <h2>Pontuações</h2>
            {jogadores.map((j) => {
              const estaEliminado = eliminado.get(j.id) ?? false;
              const ehVez = !vencedor && proximoJogador?.id === j.id;
              return (
                <div
                  key={j.id}
                  className={`linha-jogador${ehVez ? " jogador-atual" : ""}${
                    estaEliminado ? " eliminado" : ""
                  }`}
                >
                  <span>
                    {ehVez ? "▶ " : ""}
                    {j.nome}
                    {estaEliminado && <span className="etiqueta"> eliminado</span>}
                  </span>
                  <span>
                    <strong>{pontuacoes.get(j.id) ?? 0}</strong> pts
                    {!estaEliminado && (falhasSeguidas.get(j.id) ?? 0) > 0 && (
                      <span className="mudo"> · {falhasSeguidas.get(j.id)} falha(s) seguida(s)</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {!vencedor && proximoJogador && (
            <div className="cartao">
              <h2>Vez de {proximoJogador.nome}</h2>
              <p className="mudo">Toca no número de pontos deste lançamento (0 = falhou).</p>
              <div className="grelha-pontos">
                {Array.from({ length: 13 }, (_, pontos) => (
                  <button
                    key={pontos}
                    type="button"
                    className="botao-pontos"
                    onClick={() => registarPontos(proximoJogador.id, pontos)}
                  >
                    {pontos === 0 ? "Falhou" : pontos}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="botao-secundario"
            onClick={desfazerUltimaJogada}
            disabled={jogadas.length === 0}
          >
            Desfazer última jogada
          </button>
          <button type="button" className="botao-secundario" onClick={novoJogoMesmosJogadores}>
            Novo jogo (mesmos jogadores)
          </button>
          <button type="button" className="botao-secundario" onClick={terminarEVoltarAoInicio}>
            Terminar e voltar ao início
          </button>
        </>
      )}
    </main>
  );
}
