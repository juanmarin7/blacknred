import { NextRequest, NextResponse } from "next/server";
import { getSesion, requireApi, tvKeyValida } from "@/lib/auth";
import { puedeAcceder } from "@/lib/perfiles";
import { getPedidos, saveOrder } from "@/lib/pedidos";
import type { Order, VistaPedidos } from "@/lib/types";

const RUTA_POR_VISTA: Record<VistaPedidos, string> = {
  despacho: "/despacho",
  facturacion: "/facturacion",
  estados: "/estados",
};

export async function GET(request: NextRequest) {
  const vista = request.nextUrl.searchParams.get("vista") as VistaPedidos;
  if (!vista || !(vista in RUTA_POR_VISTA)) {
    return NextResponse.json({ error: "Vista inválida" }, { status: 400 });
  }

  // La TV puede entrar con llave, sin sesión (solo lectura de despacho)
  const conLlaveTv =
    vista === "despacho" &&
    tvKeyValida(request.nextUrl.searchParams.get("key"));

  if (!conLlaveTv) {
    const sesion = await getSesion();
    if (!sesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!puedeAcceder(sesion.perfil, RUTA_POR_VISTA[vista])) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  try {
    return NextResponse.json(await getPedidos(vista));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error leyendo pedidos" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const sesion = await requireApi(["admin", "vendedor"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const order = (await request.json()) as Order;
    const res = await saveOrder(order, {
      nombre: sesion.nombre,
      email: sesion.email,
    });
    return NextResponse.json({ ...res, vendedor: sesion.nombre });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error guardando pedido" },
      { status: 500 },
    );
  }
}
