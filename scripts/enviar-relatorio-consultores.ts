/**
 * Manda a cada consultor "ativo" (quem já gerou o link em /consultor) um
 * email-resumo da próxima sessão: quantas vezes o link dele (+ da equipa)
 * foi aberto, e a lista de leads inscritas pela equipa toda, com quem
 * trouxe cada uma. Pensado para correr manualmente pouco antes de uma
 * sessão começar — não está ligado a nenhum agendamento automático.
 *
 * Quem não trouxe nenhum lead (nem a equipa) não recebe email — não há
 * nada de útil para lhe mostrar.
 *
 * Corre com: CONFIRMAR=sim npm run enviar-relatorio-consultores
 * Sem essa variável, só mostra a quem enviaria e com quantos leads
 * (nada é enviado).
 */

import "./_env";
import { criarEmailSender } from "../src/lib/email";
import { estatisticasConsultor, listarLeadsConsultor, type LeadConsultor } from "../src/lib/consultor";
import { buscarDescendentesEmails } from "../src/lib/equipa";
import { db, fecharDb } from "../src/lib/db";
import { buscarWebinarRelevante } from "../src/lib/webinars";

function formatarData(data: Date): string {
  return new Date(data).toLocaleString("pt-PT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function corpoEmail(
  nomeConsultor: string | null,
  tituloWebinar: string,
  dataWebinar: Date,
  aberturas: number,
  leads: LeadConsultor[],
): string {
  const linhasLeads = leads
    .map((l, i) => {
      const trazidoPor = l.trazidoPor ?? "Eu";
      return `${i + 1}. ${l.nome}${l.telemovel ? ` — ${l.telemovel}` : ""} — trazido por: ${trazidoPor}`;
    })
    .join("\n");

  return (
    `Olá${nomeConsultor ? ` ${nomeConsultor}` : ""},\n\n` +
    `Resumo antes de "${tituloWebinar}" (${formatarData(dataWebinar)}):\n\n` +
    `Aberturas do link (tu + equipa): ${aberturas}\n` +
    `Leads inscritas (tu + equipa): ${leads.length}\n\n` +
    `As leads:\n${linhasLeads}\n\n` +
    `Boa sessão!`
  );
}

async function main(): Promise<void> {
  const confirmar = process.env.CONFIRMAR === "sim";

  const proximo = await buscarWebinarRelevante();
  if (!proximo) {
    console.log("Não há nenhuma sessão agendada — nada a enviar.");
    return;
  }

  const { rows: consultores } = await db().query<{
    referencia: string;
    nome: string | null;
    referencia_email: string;
  }>(`select referencia, nome, referencia_email from links_consultor order by nome`);

  console.log(`Sessão: ${proximo.titulo} — ${formatarData(proximo.sessaoExternaEm)}`);
  console.log(`Consultores ativos encontrados: ${consultores.length}\n`);

  const sender = criarEmailSender();
  let enviados = 0;
  let semLeads = 0;

  for (const c of consultores) {
    const descendentes = await buscarDescendentesEmails(c.referencia_email);
    const referenciaEmails = [c.referencia_email, ...descendentes];

    const [numeros, leads] = await Promise.all([
      estatisticasConsultor(proximo.id, referenciaEmails),
      listarLeadsConsultor(proximo.id, c.referencia_email, referenciaEmails, proximo.duracaoMinutos),
    ]);

    if (leads.length === 0) {
      semLeads++;
      continue;
    }

    console.log(
      `${confirmar ? "A enviar" : "Enviaria"} para ${c.nome ?? c.referencia_email} <${c.referencia_email}>` +
        ` — ${leads.length} lead(s), ${numeros.aberturas} abertura(s)`,
    );

    if (confirmar) {
      await sender.enviar({
        destinatario: c.referencia_email,
        assunto: `Resumo da tua equipa — "${proximo.titulo}"`,
        corpoTexto: corpoEmail(c.nome, proximo.titulo, proximo.sessaoExternaEm, numeros.aberturas, leads),
      });
      enviados++;
    }
  }

  console.log(`\n${semLeads} consultor(es) sem leads — não recebem email.`);
  if (!confirmar) {
    console.log(
      "\nNada foi enviado. Corre com CONFIRMAR=sim npm run enviar-relatorio-consultores para enviar a sério.",
    );
  } else {
    console.log(`\nEnviado a ${enviados} consultor(es).`);
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(fecharDb);
