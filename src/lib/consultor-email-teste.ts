import {randomUUID} from "node:crypto";
import {configActiveCampaign} from "./activecampaign";
import {db} from "./db";
import {criarEmailSender} from "./email";
import {ErroConsultorAdmin} from "./consultores-admin";

/** Envio individual pelo mesmo fornecedor dos avisos, exclusivamente a um membro existente. */
export async function enviarEmailTesteConsultor(corpo: unknown) {
  const dados = corpo && typeof corpo === "object" && !Array.isArray(corpo) ? corpo as Record<string, unknown> : {};
  const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    throw new ErroConsultorAdmin("Indica o email de um consultor registado.");
  }
  const {rows} = await db().query<{nome: string; email: string}>(
    "select nome, email from equipa_afiliados where email = $1", [email]);
  const consultor = rows[0];
  if (!consultor) throw new ErroConsultorAdmin("Este consultor já não existe. Atualiza a página.", 404);
  const configAC = configActiveCampaign();
  if (!configAC && !process.env.BREVO_API_KEY) {
    throw new ErroConsultorAdmin("O envio de emails não está configurado. Nenhum email foi enviado.", 503);
  }
  const fornecedor = configAC ? "ActiveCampaign" : "Brevo";
  const tentativaEm = new Date().toISOString();
  const chave = `consultor:email-teste:${email}`;
  const id = randomUUID();
  // Um único pedido por minuto, mesmo em abas ou instâncias diferentes.
  const tentativa = await db().query(
    `insert into dashboard_config (chave, valor, atualizado_em) values ($1, $2::jsonb, now())
     on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()
       where dashboard_config.atualizado_em <= now() - interval '1 minute'
     returning chave`, [chave, JSON.stringify({id, tentativaEm, fornecedor, estado: "a_enviar"})]);
  if (!tentativa.rows.length) throw new ErroConsultorAdmin("Já foi pedido um teste para este consultor. Aguarda um minuto antes de repetir.", 429);
  const hora = new Intl.DateTimeFormat("pt-PT", {dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Lisbon"}).format(new Date(tentativaEm));
  try {
    await criarEmailSender().enviar({
      destinatario: consultor.email,
      assunto: "Email de teste · Tropa de Elite",
      corpoTexto: `Olá${consultor.nome ? ` ${consultor.nome}` : ""},\n\n` +
        "Este email de teste foi pedido pela administração da Tropa de Elite para verificar se estás a receber as mensagens da plataforma.\n\n" +
        `Teste pedido em ${hora} (hora de Lisboa).\n\n` +
        "Se estás a ler esta mensagem, confirma à pessoa que pediu o teste que a recebeste e se chegou à caixa de entrada ou ao spam.\n\n" +
        "Equipa Tropa de Elite",
      listaActiveCampaign: configAC?.listaConsultores,
    });
  } catch (erro) {
    // Um timeout pode acontecer depois do envio: não repete automaticamente.
    await registar("incerto");
    console.error("Email de teste do consultor: fornecedor não confirmou", erro instanceof Error ? erro.name : "erro");
    throw new ErroConsultorAdmin(`O ${fornecedor} não confirmou o envio. Verifica o estado no serviço antes de repetir o teste.`, 502);
  }
  await registar("aceite");
  return {email: consultor.email, fornecedor, pedidoEm: tentativaEm};

  async function registar(estado: "aceite" | "incerto") {
    // Uma falha no registo não transforma um pedido já aceite em falha de envio.
    await db().query(
      "update dashboard_config set valor = jsonb_set(valor, '{estado}', to_jsonb($3::text)) where chave = $1 and valor->>'id' = $2",
      [chave, id, estado]).catch(() => console.error("Não foi possível registar o resultado do email de teste."));
  }
}
