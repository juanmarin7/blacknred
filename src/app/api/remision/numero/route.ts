import { NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { asignarNumeroRemision } from "@/lib/remision";

/**
 * Asigna (consume) el siguiente número de remisión, de forma atómica. Se llama
 * solo al imprimir, para no gastar consecutivo en previsualizaciones que se
 * cierran sin imprimir.
 */
export async function POST() {
  try {
    const sesion = await requireApi(["admin", "facturador"]);
    if (sesion instanceof NextResponse) return sesion;

    const numero = await asignarNumeroRemision();
    return NextResponse.json({ numero });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error asignando número" },
      { status: 500 },
    );
  }
}
