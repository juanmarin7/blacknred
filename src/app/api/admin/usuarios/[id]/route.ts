import { NextRequest, NextResponse } from "next/server";
import { requireApi } from "@/lib/auth";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario,
} from "@/lib/usuarios";
import type { Perfil } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const sesion = await requireApi(["admin"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await ctx.params;

  try {
    const body = (await request.json()) as {
      nombre?: string;
      perfil?: Perfil;
      activo?: boolean;
    };

    // No permitir que el admin se desactive a sí mismo.
    if (typeof body.activo === "boolean" && id === sesion.id && !body.activo) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propio usuario." },
        { status: 400 },
      );
    }

    if (typeof body.activo === "boolean") {
      await cambiarEstadoUsuario(id, body.activo);
    }

    const usuario = await actualizarUsuario(id, {
      nombre: body.nombre,
      perfil: body.perfil,
    });
    return NextResponse.json(usuario);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error actualizando usuario" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const sesion = await requireApi(["admin"]);
  if (sesion instanceof NextResponse) return sesion;

  const { id } = await ctx.params;

  if (id === sesion.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario." },
      { status: 400 },
    );
  }

  try {
    await eliminarUsuario(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error eliminando usuario" },
      { status: 400 },
    );
  }
}
