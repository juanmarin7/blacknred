import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { type Remision } from "@/lib/remision";
import { construirExcelRemision } from "@/lib/remisionExcel";

/** Genera y descarga el .xlsx de la remisión recibida en el cuerpo. */
export async function POST(request: NextRequest) {
  try {
    const sesion = await requireApi(["admin", "facturador"]);
    if (sesion instanceof NextResponse) return sesion;

    const rem = (await request.json()) as Remision;
    if (!rem?.items?.length) {
      return NextResponse.json(
        { error: "La remisión no tiene productos." },
        { status: 400 },
      );
    }

    const buffer = await construirExcelRemision(rem);
    const nombre =
      rem.numero > 0
        ? `Remision-${String(rem.numero).padStart(4, "0")}.xlsx`
        : "Remision-borrador.xlsx";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error generando el Excel" },
      { status: 500 },
    );
  }
}
