import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import { crearUsuario, listarUsuarios } from "@/lib/usuarios";
import type { Perfil } from "@/lib/types";

export async function GET() {
  const sesion = await requireApi(["admin"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    return NextResponse.json(await listarUsuarios());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error listando usuarios" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const sesion = await requireApi(["admin"]);
  if (sesion instanceof NextResponse) return sesion;

  try {
    const body = (await request.json()) as {
      email?: string;
      nombre?: string;
      perfil?: Perfil;
    };
    const res = await crearUsuario({
      email: body.email ?? "",
      nombre: body.nombre ?? "",
      perfil: body.perfil ?? "vendedor",
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error creando usuario" },
      { status: 400 },
    );
  }
}
