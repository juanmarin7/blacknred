import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la service_role / secret key. Tiene poderes de
 * administrador (crea usuarios, asigna perfil en app_metadata, etc.) y SALTA
 * toda la seguridad (RLS). Solo se usa en el servidor (route handlers de admin).
 *
 * La llave vive en SUPABASE_SERVICE_ROLE_KEY (server-only, nunca NEXT_PUBLIC).
 */

export function adminDisponible(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL). Revisa las variables de entorno.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
