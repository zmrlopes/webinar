import {NextResponse} from "next/server";
import {comprovativoBF, ErroBF} from "@/lib/blackfriday-servidor";
export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {return await comprovativoBF((await params).id);} catch (e) {
    return NextResponse.json({erro: e instanceof ErroBF ? e.message : "Não foi possível abrir o comprovativo."}, {status: e instanceof ErroBF ? e.status : 500});
  }
}
