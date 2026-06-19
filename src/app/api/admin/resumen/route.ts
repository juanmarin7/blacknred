import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { getResumenVentas } from "@/lib/pedidos";
import type { PeriodoResumen } from "@/lib/types";

const PERIODOS: PeriodoResumen[] = ["hoy", "semana", "mes"];

export async function GET(request: NextRequest) {
  const sesion = await requireApi(["admin"]);
  if (sesion instanceof NextResponse) return sesion;

  const raw = request.nextUrl.searchParams.get("periodo");
  const periodo: PeriodoResumen = PERIODOS.includes(raw as PeriodoResumen)
    ? (raw as PeriodoResumen)
    : "mes";
  const vendedor = request.nextUrl.searchParams.get("vendedor") || undefined;

  try {
    return NextResponse.json(await getResumenVentas(periodo, vendedor));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error generando resumen" },
      { status: 500 },
    );
  }
}
