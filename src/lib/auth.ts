import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import { esPerfil, puedeAcceder } from "./perfiles";
import type { Perfil } from "./types";

export interface Sesion {
  email: string;
  nombre: string;
  perfil: Perfil;
}

export function authConfigurada(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getSesion(): Promise<Sesion | null> {
  if (!authConfigurada()) {
    // Solo en desarrollo: permite previsualizar la app sin Supabase.
    if (process.env.NODE_ENV === "development") {
      return { email: "dev@local", nombre: "Dev", perfil: "admin" };
    }
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const perfilRaw = user.app_metadata?.perfil;
  const perfil: Perfil = esPerfil(perfilRaw) ? perfilRaw : "vendedor";
  const nombre =
    (user.user_metadata?.nombre as string | undefined) || user.email || "";

  return { email: user.email ?? "", nombre, perfil };
}

/** Para páginas (Server Components): redirige si no hay sesión o no hay acceso. */
export async function requireAcceso(ruta: string): Promise<Sesion> {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");
  if (!puedeAcceder(sesion.perfil, ruta)) redirect("/panel");
  return sesion;
}

/** Llave opcional para la pantalla de TV (sin login). */
export function tvKeyValida(key: string | null | undefined): boolean {
  const esperada = process.env.TV_ACCESS_KEY;
  return Boolean(esperada && key && key === esperada);
}

/**
 * Para route handlers: devuelve la sesión o una respuesta 401/403.
 * Uso: const s = await requireApi(['admin','vendedor']); if (s instanceof NextResponse) return s;
 */
export async function requireApi(
  permitidos: Perfil[],
): Promise<Sesion | NextResponse> {
  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!permitidos.includes(sesion.perfil)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  return sesion;
}
