import { randomUUID } from "node:crypto";
import { db } from "./db";
import { CONDICAO_CONSULTOR_COM_PAINEL } from "./equipa";
import { EMAIL_PAINEL_DEMONSTRACAO } from "./demo";
import { formacoesGravadasPublicadas } from "./formacoes-gravadas";
import type { GravacaoAdmin } from "./formacoes-gravadas-servidor";
import { enviarPushComResultado, type AvisoPush, type ResultadoPush } from "./push";

const PREFIXO = "gravacao-push:v1:";
/** CTEs acrescentados à gravação: publicação e fila ficam na mesma transação SQL. */
export const SQL_AVISO_GRAVACAO = `,
  evento as (
    insert into dashboard_config (chave, valor)
    select $3::text, jsonb_build_object('gravacaoId', valor->>'id') from gravacao
    where avisar
    on conflict (chave) do nothing returning chave
  ), destinatarios as (
    select distinct equipa_afiliados.email from equipa_afiliados
    where ${CONDICAO_CONSULTOR_COM_PAINEL}
      and ($5::boolean or email = $4::text)
      and exists (select 1 from push_subscriptions s where s.email = equipa_afiliados.email)
  ), fila as (
    insert into dashboard_config (chave, valor)
    select '${PREFIXO}' || (g.valor->>'id') || ':' || d.email,
      jsonb_build_object('gravacaoId', g.valor->>'id', 'email', d.email,
        'estado', 'pendente', 'tentativas', 0, 'disponivelEm', now())
    from gravacao g cross join evento cross join destinatarios d
    on conflict (chave) do nothing
  ) select valor from gravacao`;

interface Entrega {gravacaoId: string; email: string; tentativas: number}
export async function processarNotificacoesGravadas({gravacaoId, limite = 50, duracaoMs = 35_000, enviar = enviarPushComResultado}: {
  gravacaoId?: string; limite?: number; duracaoMs?: number;
  enviar?: (email: string, aviso: AvisoPush) => Promise<ResultadoPush>;
} = {}) {
  const prefixo = PREFIXO + (gravacaoId ? gravacaoId + ":" : "");
  const fim = Date.now() + duracaoMs;
  let tentados = 0, enviados = 0, falhas = 0;
  async function trabalhador() {
    while (tentados < limite && Date.now() < fim) {
      tentados++;
      const token = randomUUID();
      const {rows} = await db().query<{chave: string; valor: Entrega}>(`with proximo as (
        select chave from dashboard_config where starts_with(chave, $1)
          and ((valor->>'estado' = 'pendente' and (valor->>'disponivelEm')::timestamptz <= now())
            or (valor->>'estado' = 'a-enviar' and (valor->>'reservaAte')::timestamptz < now()))
        order by atualizado_em, chave limit 1 for update skip locked
      ) update dashboard_config d set valor = d.valor || jsonb_build_object(
          'estado', 'a-enviar', 'token', $2::text, 'reservaAte', now() + interval '2 minutes'), atualizado_em = now()
        from proximo p where d.chave = p.chave returning d.chave, d.valor`, [prefixo, token]);
      const entrega = rows[0];
      if (!entrega) return;
      let estado = "enviado", segundos = 0;
      try {
        const {rows: atuais} = await db().query<{valor: GravacaoAdmin}>(`select d.valor from dashboard_config d
          where d.chave = $1 and exists (select 1 from equipa_afiliados
            where email = $2 and ${CONDICAO_CONSULTOR_COM_PAINEL})
            and ($4::boolean or $2::text = $3::text)`, ["formacoes-gravadas:v1:" + entrega.valor.gravacaoId, entrega.valor.email, EMAIL_PAINEL_DEMONSTRACAO, formacoesGravadasPublicadas()]);
        const gravacao = atuais[0]?.valor;
        if (!gravacao) estado = "cancelado";
        else if (!gravacao.visivel) {estado = "pendente"; segundos = 300;}
        else {
          const resultado = await enviar(entrega.valor.email, {
            titulo: "Nova formação gravada",
            corpo: gravacao.titulo,
            url: `/consultor/formacoes/${gravacao.categoria}`,
            tag: `gravacao-${gravacao.id}`,
          });
          if (!resultado.configurado || resultado.falhas) throw new Error("Entrega pendente");
          enviados++;
        }
      } catch {
        falhas++; estado = "pendente"; segundos = Math.min(3600, 60 * 2 ** Math.min(entrega.valor.tentativas, 6));
      }
      await db().query(`update dashboard_config set valor = (valor - 'token' - 'reservaAte') ||
          jsonb_build_object('estado', $3::text, 'tentativas', (valor->>'tentativas')::int + 1,
            'disponivelEm', now() + $4::int * interval '1 second'), atualizado_em = now()
        where chave = $1 and valor->>'token' = $2`, [entrega.chave, token, estado, segundos]);
    }
  }
  await Promise.all(Array.from({length: 4}, trabalhador));
  return {enviados, falhas};
}
