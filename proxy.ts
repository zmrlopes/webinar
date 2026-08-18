import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

/**
 * Basic Auth só para /admin. Sem ADMIN_PASSWORD definida, fecha por
 * omissão (não há password por defeito a adivinhar).
 */
export function proxy(request: NextRequest): NextResponse {
  const senhaEsperada = process.env.ADMIN_PASSWORD;
  const negarAcesso = (): NextResponse =>
    new NextResponse("Autenticação necessária.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });

  if (!senhaEsperada) return negarAcesso();

  const cabecalho = request.headers.get("authorization");
  if (!cabecalho?.startsWith("Basic ")) return negarAcesso();

  const [utilizador, senha] = atob(cabecalho.slice("Basic ".length)).split(":");
  const utilizadorEsperado = process.env.ADMIN_USER ?? "admin";

  if (utilizador !== utilizadorEsperado || senha !== senhaEsperada) {
    return negarAcesso();
  }

  return NextResponse.next();
}
