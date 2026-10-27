import {NextResponse} from "next/server";
import {comprovativoBF, ErroBF} from "@/lib/blackfriday-servidor";
export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const modo = new URL(request.url).searchParams.get("modo");
    if (modo && !["real", "simulacao"].includes(modo)) throw new ErroBF("Modo inválido.");
    return await comprovativoBF((await params).id, undefined, modo === "simulacao");
  } catch (e) {
    return NextResponse.json({erro: e instanceof ErroBF ? e.message : "Não foi possível abrir o comprovativo."}, {status: e instanceof ErroBF ? e.status : 500});
  }
}
