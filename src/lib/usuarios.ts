import { randomBytes } from "crypto";
import { adminDisponible, createAdminClient } from "./supabase/admin";
import { nombreDesdeEmail } from "./auth";
import { esPerfil } from "./perfiles";
import type { Perfil } from "./types";

/**
 * Gestión de usuarios para el módulo de administración. Usa el cliente admin
 * (service_role) de Supabase Auth. Modelo de datos en cada usuario:
 *  - user_metadata.display_name      → nombre visible
 *  - user_metadata.must_change_password → obliga a cambiar la clave al entrar
 *  - app_metadata.perfil             → perfil (admin/vendedor/...)
 *
 * Sin SUPABASE_SERVICE_ROLE_KEY (p. ej. en local con MOCK), se devuelven datos
 * de ejemplo para que la pantalla sea navegable, pero no se persiste nada.
 */

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string;
  perfil: Perfil;
  activo: boolean;
  debeCambiarPassword: boolean;
  ultimoAcceso: string | null;
  creado: string;
}

const DURACION_BAN = "876000h"; // ~100 años = desactivado

const MOCK_USUARIOS: UsuarioAdmin[] = [
  {
    id: "mock-1",
    email: "blackredunderwear@gmail.com",
    nombre: "Administrador",
    perfil: "admin",
    activo: true,
    debeCambiarPassword: false,
    ultimoAcceso: new Date().toISOString(),
    creado: new Date().toISOString(),
  },
];

/** Contraseña temporal legible: "Bnr-" + 8 caracteres sin ambiguos (0/O, 1/l). */
export function generarPasswordTemporal(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += chars[bytes[i] % chars.length];
  return "Bnr-" + s;
}

interface SupabaseUserLike {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

function mapUsuario(u: SupabaseUserLike): UsuarioAdmin {
  const meta = u.user_metadata ?? {};
  const perfilRaw = u.app_metadata?.perfil;
  const banned = u.banned_until ? new Date(u.banned_until) > new Date() : false;
  const nombre =
    (meta.display_name as string | undefined)?.trim() ||
    (meta.nombre as string | undefined)?.trim() ||
    nombreDesdeEmail(u.email ?? undefined);

  return {
    id: u.id,
    email: u.email ?? "",
    nombre,
    perfil: esPerfil(perfilRaw) ? perfilRaw : "vendedor",
    activo: !banned,
    debeCambiarPassword: meta.must_change_password === true,
    ultimoAcceso: u.last_sign_in_at ?? null,
    creado: u.created_at ?? "",
  };
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  if (!adminDisponible()) return MOCK_USUARIOS;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);

  return data.users
    .map((u) => mapUsuario(u as SupabaseUserLike))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function crearUsuario(input: {
  email: string;
  nombre: string;
  perfil: Perfil;
}): Promise<{ usuario: UsuarioAdmin; passwordTemporal: string }> {
  const email = input.email.trim().toLowerCase();
  const nombre = input.nombre.trim();
  if (!email) throw new Error("El correo es obligatorio.");
  if (!esPerfil(input.perfil)) throw new Error("Perfil inválido.");

  const passwordTemporal = generarPasswordTemporal();

  if (!adminDisponible()) {
    return {
      usuario: {
        id: "mock-" + Date.now(),
        email,
        nombre: nombre || nombreDesdeEmail(email),
        perfil: input.perfil,
        activo: true,
        debeCambiarPassword: true,
        ultimoAcceso: null,
        creado: new Date().toISOString(),
      },
      passwordTemporal,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: passwordTemporal,
    email_confirm: true,
    app_metadata: { perfil: input.perfil },
    user_metadata: {
      display_name: nombre || nombreDesdeEmail(email),
      must_change_password: true,
    },
  });
  if (error) throw new Error(error.message);

  return { usuario: mapUsuario(data.user as SupabaseUserLike), passwordTemporal };
}

export async function actualizarUsuario(
  id: string,
  cambios: { nombre?: string; perfil?: Perfil },
): Promise<UsuarioAdmin> {
  if (cambios.perfil && !esPerfil(cambios.perfil)) {
    throw new Error("Perfil inválido.");
  }

  if (!adminDisponible()) {
    const base = MOCK_USUARIOS[0];
    return {
      ...base,
      id,
      nombre: cambios.nombre?.trim() || base.nombre,
      perfil: cambios.perfil ?? base.perfil,
    };
  }

  const admin = createAdminClient();
  const attrs: { app_metadata?: object; user_metadata?: object } = {};
  if (cambios.perfil) attrs.app_metadata = { perfil: cambios.perfil };
  if (typeof cambios.nombre === "string") {
    attrs.user_metadata = { display_name: cambios.nombre.trim() };
  }

  const { data, error } = await admin.auth.admin.updateUserById(id, attrs);
  if (error) throw new Error(error.message);
  return mapUsuario(data.user as SupabaseUserLike);
}

export async function resetearPassword(
  id: string,
): Promise<{ passwordTemporal: string }> {
  const passwordTemporal = generarPasswordTemporal();
  if (!adminDisponible()) return { passwordTemporal };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: passwordTemporal,
    user_metadata: { must_change_password: true },
  });
  if (error) throw new Error(error.message);
  return { passwordTemporal };
}

export async function cambiarEstadoUsuario(
  id: string,
  activo: boolean,
): Promise<void> {
  if (!adminDisponible()) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: activo ? "none" : DURACION_BAN,
  });
  if (error) throw new Error(error.message);
}

export async function eliminarUsuario(id: string): Promise<void> {
  if (!adminDisponible()) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
}
