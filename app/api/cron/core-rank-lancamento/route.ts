import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const maxDuration = 60;
const CAMPANHA = "core-rank:2026:lancamento";
type Autorizacao = { tokenHash: string; expiraEm: string; concluido?: boolean };

/** Lançamento único: autorização temporária guardada pelo operador na base de dados. */
export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return NextResponse.json({erro: "Não autorizado."}, {status: 401});
  const cliente = await db().connect();
  let bloqueado = false;
  try {
    const {rows} = await cliente.query<{valor: Autorizacao}>("select valor from dashboard_config where chave = $1", [`${CAMPANHA}:autorizacao`]);
    const autorizacao = rows[0]?.valor;
    const hash = createHash("sha256").update(token).digest();
    if (!autorizacao || !/^[a-f0-9]{64}$/.test(autorizacao.tokenHash) || !timingSafeEqual(hash, Buffer.from(autorizacao.tokenHash, "hex")) || !Number.isFinite(Date.parse(autorizacao.expiraEm)) || Date.parse(autorizacao.expiraEm) <= Date.now()) {
      return NextResponse.json({erro: "Não autorizado."}, {status: 401});
    }
    const resumo = async () => {
      const {rows: resultados} = await cliente.query<{estado: string; quantidade: string}>("select valor->>'estado' as estado, count(*) as quantidade from dashboard_config where chave like $1 group by valor->>'estado'", [`${CAMPANHA}:push:%`]);
      return Object.fromEntries(resultados.map(r => [r.estado, Number(r.quantidade)]));
    };
    if (autorizacao.concluido) return NextResponse.json({concluido: true, resultados: await resumo()});
    const {rows: locks} = await cliente.query<{obtido: boolean}>("select pg_try_advisory_lock(hashtext($1)) as obtido", [CAMPANHA]);
    bloqueado = locks[0]?.obtido === true;
    if (!bloqueado) return NextResponse.json({erro: "Envio em curso."}, {status: 409});
    const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privada = process.env.VAPID_PRIVATE_KEY;
    if (!publica || !privada) return NextResponse.json({erro: "Notificações não configuradas."}, {status: 503});
    const webpush = await import("web-push");
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:geral@viajareviver.net", publica, privada);
    const {rows: destinatarios} = await cliente.query<{email: string; endpoint: string; p256dh: string; auth: string}>(
      "select p.email, p.endpoint, p.p256dh, p.auth from push_subscriptions p where exists (select 1 from equipa_afiliados e where e.email = lower(p.email)) order by p.endpoint",
    );
    let processados = 0, restantes = 0;
    for (const d of destinatarios) {
      const chave = `${CAMPANHA}:push:${createHash("sha256").update(d.endpoint).digest("hex")}`;
      const {rows: anterior} = await cliente.query("select chave from dashboard_config where chave = $1", [chave]);
      if (anterior.length) continue;
      if (processados >= 8) {restantes++; continue;}
      const claim = await cliente.query("insert into dashboard_config (chave, valor) values ($1, $2::jsonb) on conflict (chave) do nothing returning chave", [chave, JSON.stringify({email: d.email, estado: "a-enviar", iniciadoEm: new Date().toISOString()})]);
      if (!claim.rowCount) continue;
      processados++;
      let estado = "enviado", codigo: number | undefined;
      try {
        await webpush.sendNotification({endpoint: d.endpoint, keys: {p256dh: d.p256dh, auth: d.auth}}, JSON.stringify({
          titulo: "🏆 O desafio Core Rank está lançado!",
          corpo: "Até 31 de dezembro: 3 novos TPs + 3.000€ em vendas confirmadas. Abre o teu plano diário e começa hoje.",
          url: "/consultor/core-rank",
        }), {timeout: 5000, TTL: 86400});
      } catch (erro) {
        codigo = (erro as {statusCode?: number}).statusCode;
        estado = codigo === 404 || codigo === 410 ? "expirado" : "erro";
        if (estado === "expirado") await cliente.query("delete from push_subscriptions where endpoint = $1", [d.endpoint]);
      }
      await cliente.query("update dashboard_config set valor = $2::jsonb, atualizado_em = now() where chave = $1", [chave, JSON.stringify({email: d.email, estado, codigo, terminadoEm: new Date().toISOString()})]);
    }
    if (!restantes) await cliente.query("update dashboard_config set valor = jsonb_set(valor, '{concluido}', 'true'::jsonb), atualizado_em = now() where chave = $1", [`${CAMPANHA}:autorizacao`]);
    return NextResponse.json({concluido: !restantes, restantes, resultados: await resumo()});
  } catch {
    return NextResponse.json({erro: "Não foi possível concluir o lançamento."}, {status: 500});
  } finally {
    if (bloqueado) await cliente.query("select pg_advisory_unlock(hashtext($1))", [CAMPANHA]);
    cliente.release();
  }
}
