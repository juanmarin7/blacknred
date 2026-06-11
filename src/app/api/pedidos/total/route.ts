import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { modificarTotal } from "@/lib/pedidos";

export async function POST(request: NextRequest) {
  const sesion = await requireApi(["admin", "despachador"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const { row, cantidad } = (await request.json()) as {
      row: number;
      cantidad: string | number;
    };
    await modificarTotal(row, cantidad);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error modificando pedido" },
      { status: 500 },
    );
  }
}
