import { NextRequest, NextResponse } from "next/server";
import { getSesion, tvKeyValida } from "@/lib/auth";
import { getFirmaVentas } from "@/lib/pedidos";

export async function GET(request: NextRequest) {
  const conLlaveTv = tvKeyValida(request.nextUrl.searchParams.get("key"));

  if (!conLlaveTv) {
    const sesion = await getSesion();
    if (!sesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
  }

  try {
    return NextResponse.json({ firma: await getFirmaVentas() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
