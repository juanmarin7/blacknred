import { NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { getInitialData } from "@/lib/pedidos";

export async function GET() {
  const sesion = await requireApi(["admin", "vendedor"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    return NextResponse.json(await getInitialData());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error leyendo datos" },
      { status: 500 },
    );
  }
}
