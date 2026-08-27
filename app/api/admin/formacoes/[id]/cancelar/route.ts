import { NextResponse } from "next/server";
import { cancelarFormacao } from "@/lib/webinars";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const cancelada = await cancelarFormacao(id);
  if (!cancelada) {
    return NextResponse.json(
      { erro: "não encontrada, ou não é uma formação ad-hoc" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
