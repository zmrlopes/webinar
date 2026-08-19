import { sincronizarContactoInscrito } from "./brevo-contatos";
import { db } from "./db";
import { enviarConfirmacao, notificarConsultorSobreLead, type EmailSender } from "./email";
import { pedirLinkPessoal, proximaTentativa, SalaError } from "./sala-zoom";
import { sincronizarSessoes } from "./sessoes";

interface LinhaFila {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  telemovel: string | null;
  referencia: string | null;
  link_tentativas: number;
  sessao_externa_id: string;
}

export interface ResultadoFila {
  obtidos: number;
  falhados: number;
  reagendados: number;
}

async function buscarLote(tamanho: number): Promise<LinhaFila[]> {
  const { rows } = await db().query<LinhaFila>(
    `select r.id, r.nome, r.apelido, r.email, r.telemovel, r.referencia, r.link_tentativas, w.sessao_externa_id
     from registrations r
     join webinars w on w.id = r.webinar_id
     where r.link_estado = 'pendente'
       and r.cancelada_em is null
       and w.cancelada_em is null
       and w.sessao_externa_id is not null
       and (r.link_proxima_em is null or r.link_proxima_em <= now())
     order by r.criado_em
     limit $1`,
    [tamanho],
  );
  return rows;
}

async function marcarObtido(id: string, link: string): Promise<void> {
  await db().query(
    `update registrations
     set link_pessoal = $1, link_pedido_em = now(), link_estado = 'obtido'
     where id = $2`,
    [link, id],
  );
}

async function marcarFalhado(id: string, tentativas: number, erro: string): Promise<void> {
  await db().query(
    `update registrations
     set link_estado = 'falhado', link_tentativas = $1, link_ultimo_erro = $2
     where id = $3`,
    [tentativas, erro, id],
  );
}

async function reagendar(id: string, tentativas: number, proxima: Date, erro: string): Promise<void> {
  await db().query(
    `update registrations
     set link_tentativas = $1, link_proxima_em = $2, link_ultimo_erro = $3
     where id = $4`,
    [tentativas, proxima, erro, id],
  );
}

async function cancelarSeSessaoCancelada(id: string, webinarSessaoExternaId: string): Promise<boolean> {
  const { rows } = await db().query<{ cancelada_em: Date | null }>(
    `select cancelada_em from webinars where sessao_externa_id = $1`,
    [webinarSessaoExternaId],
  );
  if (rows[0]?.cancelada_em) {
    await db().query(`update registrations set cancelada_em = now() where id = $1`, [id]);
    return true;
  }
  return false;
}

/**
 * Secção 7-C do guia: obter o link e só depois enfileirar o email.
 *
 * Lote pequeno (20-50, por omissão 25) por ciclo — corre a cada 5 minutos
 * (secção 9). 401 propaga para quem chamar: é erro de configuração, não se
 * repete sozinho.
 */
export async function processarFilaLinks(opts?: {
  tamanhoLote?: number;
  sender?: EmailSender;
}): Promise<ResultadoFila> {
  const tamanhoLote = opts?.tamanhoLote ?? 25;
  const lote = await buscarLote(tamanhoLote);

  const resultado: ResultadoFila = { obtidos: 0, falhados: 0, reagendados: 0 };

  for (const linha of lote) {
    try {
      const link = await pedirLinkPessoal({
        sessao: linha.sessao_externa_id,
        nome: linha.nome,
        apelido: linha.apelido,
        email: linha.email,
      });
      await marcarObtido(linha.id, link);
      resultado.obtidos += 1;

      // A partir daqui o link já está gravado — uma falha num destes três
      // passos (email de confirmação, sincronização Brevo, aviso ao
      // consultor) não pode ser confundida com falha a obter o link, nem
      // reabrir uma inscrição já bem sucedida. Por isso cada um tem o seu
      // próprio try/catch, só regista o erro.
      if (opts?.sender) {
        try {
          await enviarConfirmacao(opts.sender, linha.id);
        } catch (erroEmail) {
          console.error("falha ao enviar confirmação:", erroEmail);
        }
      }

      try {
        await sincronizarContactoInscrito({
          email: linha.email,
          nome: linha.nome,
          telemovel: linha.telemovel,
          referencia: linha.referencia,
        });
      } catch (erroBrevo) {
        console.error("falha ao sincronizar contacto na Brevo:", erroBrevo);
      }

      if (opts?.sender) {
        try {
          await notificarConsultorSobreLead(opts.sender, linha.id);
        } catch (erroNotificacao) {
          console.error("falha ao notificar consultor:", erroNotificacao);
        }
      }

      continue;
    } catch (erro) {
      if (erro instanceof SalaError) {
        if (erro.estado === 401) {
          throw erro; // parar tudo e alertar: é configuração
        }
        if (erro.estado === 404) {
          await sincronizarSessoes();
          const cancelada = await cancelarSeSessaoCancelada(linha.id, linha.sessao_externa_id);
          if (cancelada) continue;
          // não era cancelamento — tenta outra vez mais tarde, como um 503
        }
        if (erro.estado === 400) {
          await marcarFalhado(linha.id, linha.link_tentativas + 1, erro.message);
          resultado.falhados += 1;
          continue;
        }
      }

      const tentativas = linha.link_tentativas + 1;
      const proxima = proximaTentativa(linha.link_tentativas, new Date());
      const mensagemErro = erro instanceof Error ? erro.message : String(erro);

      if (proxima === null) {
        await marcarFalhado(linha.id, tentativas, mensagemErro);
        resultado.falhados += 1;
      } else {
        await reagendar(linha.id, tentativas, proxima, mensagemErro);
        resultado.reagendados += 1;
      }

      if (erro instanceof SalaError && erro.estado === 429) {
        break; // parar o resto deste ciclo
      }
    }
  }

  return resultado;
}
