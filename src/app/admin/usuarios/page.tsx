import { requireAcceso } from "@/lib/auth";
import { adminDisponible } from "@/lib/supabase/admin";
import UsuariosAdmin from "./UsuariosAdmin";

export default async function UsuariosPage() {
  const sesion = await requireAcceso("/admin/usuarios");

  return <UsuariosAdmin sesionId={sesion.id} configurado={adminDisponible()} />;
}
