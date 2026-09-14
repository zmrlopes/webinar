import Link from "next/link";
import { db } from "@/lib/db";
import { CONDICAO_CONSULTOR_COM_PAINEL } from "@/lib/equipa";
import { BotaoSincronizarLista } from "./botao-sincronizar";

export const dynamic = "force-dynamic";

export default async function AdminActiveCampaign() {
  const { rows } = await db().query<{ com_painel: string; total: string }>(
    `select count(*) filter (where ${CONDICAO_CONSULTOR_COM_PAINEL}) as com_painel,
            count(*) as total
     from equipa_afiliados`,
  );
  const comPainel = Number(rows[0]?.com_painel ?? 0);
  const total = Number(rows[0]?.total ?? 0);

  return (
    <main className="ad-pagina">
      <style>{`
        .ad-pagina {
          max-width: none;
          background: #ffffff;
          color: #000000;
          margin: 0;
          padding: 2.5rem clamp(1.25rem, 5vw, 4rem) 4rem;
          min-height: calc(100vh - 4rem);
        }
        .ad-caixa { max-width: 780px; margin: 0 auto; }
        .ad-pagina h1 { color: #000000; font-size: 1.5rem; margin: 0.75rem 0 0.4rem; }
        .ad-pagina h2 { color: #4b5320; font-size: 1.05rem; margin: 2rem 0 0.6rem; }
        .ad-pagina p { font-size: 0.95rem; line-height: 1.55; }
        .ad-legenda { color: #6b6a63; font-size: 0.85rem; margin-top: 0.4rem; }
        .ad-voltar { color: #4b5320; font-size: 0.85rem; text-decoration: none; }
        .ad-voltar:hover { text-decoration: underline; }
        .ad-cartao {
          background: #f7f6f3;
          border: 1px solid #ececE6;
          border-radius: 14px;
          padding: 1.1rem 1.25rem;
        }
        .ad-aviso {
          background: #fdf3e0;
          border: 1px solid #e2cf94;
          color: #4a3c10;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          font-size: 0.9rem;
          line-height: 1.55;
        }
      `}</style>

      <div className="ad-caixa">
        <Link href="/admin" className="ad-voltar">
          ← Início
        </Link>
        <h1>ActiveCampaign</h1>
        <p className="ad-legenda">
          Lista &ldquo;Consultores ativos&rdquo; — é por ela que passam os avisos de nova sessão enviados à
          equipa.
        </p>

        <h2>Porque é que isto existe</h2>
        <p>
          Na ActiveCampaign o cancelamento de subscrição é <strong>por lista</strong>, e uma automação não
          entrega o email a quem está descansado da lista por onde entrou. Há centenas de contactos nessa
          situação, herdados de listas antigas de leads — e é por isso que vários consultores não receberam o
          aviso da nova webinar, apesar de o sistema o dar como enviado.
        </p>
        <p>
          A lista &ldquo;Consultores ativos&rdquo; é nova, portanto ninguém se descansou dela. Ao pôr lá os
          consultores, os avisos voltam a chegar. A partir de agora cada aviso também subscreve o
          destinatário nesta lista antes de sair, por isso quem gerar o seu link fica coberto sem mais
          nada.
        </p>

        <h2>Quem conta como consultor</h2>
        <p>
          Quem está <strong>registado na plataforma</strong>: já entrou em <code>/consultor</code> e gerou
          o seu link. O CSV da equipa traz centenas de pessoas que nunca o fizeram — um aviso a dizer
          &ldquo;vai ao teu painel inscrever-te&rdquo; não lhes diz nada, por isso não o recebem.
        </p>

        <div className="ad-aviso">
          Um caso que isto não resolve: contactos marcados como <strong>bounced</strong> ficam bloqueados na
          ActiveCampaign de forma global, independentemente da lista. Se um consultor continuar sem receber
          depois desta sincronização, é quase de certeza esse o motivo — o email dele está a devolver.
        </div>

        <h2>Sincronizar</h2>
        <p>
          <strong>{comPainel}</strong> consultores com painel, dos {total} que vêm no CSV da equipa. São
          estes — e só estes — que entram na lista e recebem os avisos. Podes carregar quantas vezes
          quiseres: quem já lá está não fica duplicado, e quem entretanto deixou de pertencer ao conjunto
          é retirado da lista.
        </p>
        <BotaoSincronizarLista />
      </div>
    </main>
  );
}
