"use client";

import { useRouter } from "next/navigation";
import { createClient, supabaseConfigurado } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function cerrarSesion() {
    if (supabaseConfigurado()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="rounded-lg border border-line-strong px-6 py-2.5 text-sm font-semibold tracking-wide text-muted-2 uppercase transition-colors hover:bg-line-soft hover:text-[#ccc]"
    >
      Cerrar sesión
    </button>
  );
}
