import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { generarRemision } from "@/lib/remision";

export async function POST(request: NextRequest) {
  try {
    const sesion = await requireApi(["admin", "facturador"]);
    if (sesion instanceof NextResponse) return sesion;

    const { codigos } = (await request.json()) as { codigos?: string[] };
    if (!Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json(
        { error: "No se seleccionaron pedidos." },
        { status: 400 },
      );
    }

    const remision = await generarRemision(codigos);
    return NextResponse.json(remision);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error generando la remisión" },
      { status: 500 },
    );
  }
}
