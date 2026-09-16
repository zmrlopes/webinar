import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa de Ajudas de Custo",
  description: "Preenche o mapa mensal de ajudas de custo e gera o PDF para assinatura.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
