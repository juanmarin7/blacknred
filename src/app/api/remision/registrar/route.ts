import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { registrarRemision, type Remision } from "@/lib/remision";

/**
 * Guarda la remisión ORIGINAL en la hoja histórica `Remisiones`. Se llama al
 * imprimir, con el REM N° ya firme. Idempotente por número (upsert): reimprimir
 * o rearmar la misma remisión no crea filas duplicadas.
 */
export async function POST(request: NextRequest) {
  try {
    const sesion = await requireApi(["admin", "facturador"]);
    if (sesion instanceof NextResponse) return sesion;

    const rem = (await request.json()) as Remision;
    if (!rem?.numero || rem.numero <= 0) {
      return NextResponse.json(
        { error: "La remisión no tiene número asignado." },
        { status: 400 },
      );
    }

    await registrarRemision(rem);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error registrando la remisión" },
      { status: 500 },
    );
  }
}
