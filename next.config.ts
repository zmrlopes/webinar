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
    "/admin/migrar": ["./migrations/**/*"],
    "/api/admin/migrar": ["./migrations/**/*"],
  },
};

export default nextConfig;
