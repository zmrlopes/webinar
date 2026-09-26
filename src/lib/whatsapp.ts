/**
 * Só o link do WhatsApp (wa.me) — sem API, sem conta Business, sem custo.
 * Abre a conversa já com a mensagem escrita, pronta a rever e enviar; não
 * envia nada sozinho, é sempre a pessoa a clicar em enviar do lado do
 * WhatsApp. Assume número português quando vem só com 9 dígitos, sem
 * indicativo — é como a maioria fica guardada nas inscrições do evento.
 */
export function linkWhatsApp(telemovel: string, mensagem: string): string {
  let limpo = telemovel.trim().replace(/[^\d+]/g, "");
  if (limpo.startsWith("+")) limpo = limpo.slice(1);
  else if (limpo.startsWith("00")) limpo = limpo.slice(2);
  else if (limpo.length === 9) limpo = `351${limpo}`;
  return `https://wa.me/${limpo}?text=${encodeURIComponent(mensagem)}`;
}
