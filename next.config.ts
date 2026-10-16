import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/consultor/backoffice/webinares", destination: "/consultor/webinares", permanent: true },
      { source: "/consultor/backoffice", destination: "/consultor", permanent: true },
    ];
  },
  // /admin/migrar lê os ficheiros .sql em tempo de execução (readdir), o que
  // o rastreio automático de ficheiros da Vercel não apanha sozinho — sem
  // isto, a pasta migrations/ não ia parar ao pacote da função e o botão
  // falhava em produção com "pasta não encontrada".
  outputFileTracingIncludes: {
    "/api/consultor/nova-area/reservas/imagem": ["./public/icligo-logo.png", "./public/fonts/Poppins-*.ttf"],
    "/admin/migrar": ["./migrations/**/*"],
    "/api/admin/migrar": ["./migrations/**/*"],
    // O travel planner desenha as páginas com estas fontes e o logótipo, lidos do disco.
    "/api/consultor/nova-area/travel-planner": ["./public/fonts/Poppins-*.ttf", "./public/fonts/PlayfairDisplay-Variable.ttf", "./public/icligo-logo.png"],
  },
  // Binário nativo de desenho (canvas); não pode ser empacotado.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
