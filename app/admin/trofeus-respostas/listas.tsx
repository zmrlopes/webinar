"use client";
import { useState } from "react";
import type { InscritoFaturacao, InscritoSemResposta } from "@/lib/teambuilding";
import type { RespostaTrofeusAdmin } from "@/lib/trofeus";
import { PesquisaTPs, correspondePesquisaTP } from "../pesquisa-tps";
import { PatamaresInscritos } from "../eventos/teambuilding/patamares-inscritos";
import { LinhaResposta } from "./linha";
import { BotaoWhatsApp } from "../botao-whatsapp";

export function ListasTrofeus({inscritos, respostas: todasRespostas, semResposta: todosSemResposta, base}: {
 inscritos: InscritoFaturacao[]; respostas: RespostaTrofeusAdmin[]; semResposta: InscritoSemResposta[]; base: string;
}) {
 const [pesquisa, setPesquisa] = useState("");
 const visiveis = inscritos.filter(i => correspondePesquisaTP(i, pesquisa));
 const respostas = todasRespostas.filter(i => correspondePesquisaTP(i, pesquisa));
 const semResposta = todosSemResposta.filter(i => correspondePesquisaTP(i, pesquisa));
 return <>
  <PesquisaTPs valor={pesquisa} alterar={setPesquisa} />
  {pesquisa && <p role="status" className="ad-legenda">{new Set([...visiveis,...respostas,...semResposta].map(i=>i.email.trim().toLowerCase())).size} TP(s) encontrado(s).</p>}
        <PatamaresInscritos inscritos={visiveis} />
        <h2>Respostas</h2>
        {respostas.length === 0 ? (
          <p className="ad-legenda">{pesquisa ? "Não há respostas de TPs para esta pesquisa." : "Ainda ninguém respondeu."}</p>
        ) : (
          <div className="ad-tabela-wrap">
            <table className="ad-tabela">
              <thead>
                <tr>
                  <th>Consultor</th>
                  <th>Patamar</th>
                  <th>Quer receber</th>
                  <th>Já tem</th>
                  <th>Quando</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {respostas.map((r) => (
                  <LinhaResposta resposta={r} key={r.email} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2>Ainda por responder</h2>
        {semResposta.length === 0 ? (
          <p className="ad-legenda">{pesquisa ? "Não há TPs por responder para esta pesquisa." : "Respondeu toda a gente que está inscrita."}</p>
        ) : (
          <div className="ad-cartao">
            {semResposta.map((i) => (
              <div
                key={i.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                  fontSize: "0.9rem",
                  padding: "0.3rem 0",
                }}
              >
                <span>
                  {i.nome} <span className="ad-legenda">— {i.email}</span>
                </span>
                <BotaoWhatsApp
                  telemovel={i.telemovel}
                  mensagem={`Olá ${i.nome}, ainda não respondeste ao questionário dos troféus do Teambuilding. Entra na tua área de consultor para responderes: ${base}/consultor`}
                />
              </div>
            ))}
          </div>
        )}
 </>;
}
