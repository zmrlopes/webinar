import { NextResponse } from "next/server";
import { cancelarInscricaoAdmin } from "@/lib/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  await cancelarInscricaoAdmin(id);
  return NextResponse.json({ ok: true });
}
