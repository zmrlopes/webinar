import { linkWhatsApp } from "@/lib/whatsapp";

const ESTILO: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  background: "#25d366",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "0.25rem 0.75rem",
  fontSize: "0.78rem",
  fontWeight: 700,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

/**
 * Abre o WhatsApp com a mensagem já escrita — o clique é sempre manual,
 * um de cada vez, por quem está a olhar para a lista (não é um envio em
 * massa como os avisos por email/push). Sem número guardado, não há
 * botão — não há para onde abrir.
 */
export function BotaoWhatsApp({ telemovel, mensagem }: { telemovel: string; mensagem: string }) {
  if (!telemovel.trim()) return null;
  return (
    <a href={linkWhatsApp(telemovel, mensagem)} target="_blank" rel="noreferrer" style={ESTILO}>
      WhatsApp
    </a>
  );
}
