import { NextResponse } from "next/server";
import { verificarSegredoCron } from "@/lib/cron-auth";
import { sincronizarForumIcligo } from "@/lib/forum-icligo";

export const maxDuration = 60;
export async function GET(request: Request): Promise<Response> {
  const negado = verificarSegredoCron(request);
  if (negado) return negado;
  const meses = await sincronizarForumIcligo();
  return NextResponse.json({ meses });
}
