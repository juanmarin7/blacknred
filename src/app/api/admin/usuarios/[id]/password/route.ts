import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { resetearPassword } from "@/lib/usuarios";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const sesion = await requireApi(["admin"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await ctx.params;

  try {
    return NextResponse.json(await resetearPassword(id));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error reseteando contraseña" },
      { status: 400 },
    );
  }
}
