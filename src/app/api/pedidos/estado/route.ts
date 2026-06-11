import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { cambiarEstado } from "@/lib/pedidos";
import type { Perfil } from "@/lib/types";

const PERMISOS: Record<string, Perfil[]> = {
  Enviado: ["admin", "despachador"],
  Facturado: ["admin", "facturador"],
};

export async function POST(request: NextRequest) {
  try {
    const { row, estado } = (await request.json()) as {
      row: number;
      estado: "Enviado" | "Facturado";
    };

    const permitidos = PERMISOS[estado];
    if (!permitidos) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const sesion = await requireApi(permitidos);
    if (sesion instanceof NextResponse) return sesion;

    await cambiarEstado(row, estado);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error cambiando estado" },
      { status: 500 },
    );
  }
}
