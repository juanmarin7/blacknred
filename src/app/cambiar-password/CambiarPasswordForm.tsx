"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingOverlay from "@/components/LoadingOverlay";
import { LOGO_URL, LOGO_FOOTER_URL } from "@/lib/branding";

const MIN = 8;

export default function CambiarPasswordForm({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN) {
      setError(`La contraseña debe tener al menos ${MIN} caracteres.`);
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (err) {
        setError(err.message || "No se pudo cambiar la contraseña.");
        return;
      }
      router.replace("/panel");
      router.refresh();
    } catch {
      setError("Error de conexión, intente de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt="Black & Red"
        className="h-[70px] object-contain md:h-[90px]"
      />

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-wide uppercase">
          Cambia tu contraseña
        </h1>
        <p className="mt-2 text-sm text-muted-2">
          Hola {nombre}, por seguridad debes definir una contraseña nueva antes
          de continuar.
        </p>
      </div>

      <form
        onSubmit={cambiar}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold tracking-wider text-muted uppercase">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-base text-white transition-colors focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,59,59,0.12)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold tracking-wider text-muted uppercase">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-base text-white transition-colors focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,59,59,0.12)] focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-wine bg-wine/30 px-3 py-2.5 text-center text-sm text-[#ff6b6b]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="mt-1 w-full rounded-lg bg-wine py-3.5 text-lg font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-px hover:bg-wine-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Guardar y continuar
        </button>
      </form>

      <footer className="fixed bottom-0 left-0 flex w-full justify-center border-t border-line-soft bg-base py-3 opacity-70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_FOOTER_URL}
          alt="Black & Red"
          className="h-[30px] object-contain"
        />
      </footer>

      <LoadingOverlay visible={cargando} texto="Guardando..." />
    </main>
  );
}
