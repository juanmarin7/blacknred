import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { modificarRemision } from "@/lib/remision";

/**
 * Modifica una remisión existente por porcentaje. `pct` es el % que se QUITA a
 * cantidades y valores (10 → queda el 90%). Carga la original de la hoja, aplica
 * el %, guarda la versión modificada (mismo REM N°) y la devuelve.
 */
export async function POST(request: NextRequest) {
  try {
    const sesion = await requireApi(["admin", "facturador"]);
    if (sesion instanceof NextResponse) return sesion;

    const { numero, pct } = (await request.json()) as {
      numero?: number;
      pct?: number;
    };

    if (!numero || numero <= 0) {
      return NextResponse.json(
        { error: "Falta el número de remisión." },
        { status: 400 },
      );
    }
    if (typeof pct !== "number" || !Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      return NextResponse.json(
        { error: "El porcentaje debe ser un número mayor que 0 y menor que 100." },
        { status: 400 },
      );
    }

    const modificada = await modificarRemision(numero, pct);
    return NextResponse.json({ remision: modificada });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error modificando la remisión" },
      { status: 500 },
    );
  }
}
