import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse usa um binário nativo (@napi-rs/canvas) para poder ler PDFs
  // no Node — sem isto, o bundler da Next tenta empacotá-lo como se fosse
  // JS normal, o binário não carrega em produção, e a extração de texto
  // falha com "DOMMatrix is not defined" (o polyfill que precisava dele
  // nunca chega a ser aplicado).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
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
    // o binário nativo do @napi-rs/canvas é escolhido com um require()
    // dinâmico consoante a plataforma (ver node_modules/@napi-rs/canvas/js-binding.js)
    // — o rastreio automático da Vercel não segue isso, por isso sem isto o
    // ficheiro .node nunca ia parar ao pacote da função (Vercel corre em
    // Linux x64 glibc, daí ser só a variante "gnu").
    "/api/admin/objecoes/diretrizes/pdf": ["./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*"],
  },
};

export default nextConfig;
