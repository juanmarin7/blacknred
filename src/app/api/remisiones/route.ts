import { NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { leerRemisiones } from "@/lib/remision";

/**
 * Lista las remisiones de la hoja histórica, agrupadas por REM N° (original +
 * su versión modificada si existe). La usa la vista `/remisiones` (facturación).
 */
export async function GET() {
  try {
    const sesion = await requireApi(["admin", "facturador"]);
    if (sesion instanceof NextResponse) return sesion;

    const remisiones = await leerRemisiones();
    return NextResponse.json({ remisiones });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error leyendo las remisiones" },
      { status: 500 },
    );
  }
}
