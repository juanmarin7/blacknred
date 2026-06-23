"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigurado } from "@/lib/supabase/client";
import LoadingOverlay from "@/components/LoadingOverlay";
import { LOGO_URL, LOGO_FOOTER_URL } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const configurado = supabaseConfigurado();

  async function iniciarLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Ingrese correo y contraseña");
      return;
    }

    setCargando(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (err) {
        setError("Correo o contraseña incorrectos");
        setPassword("");
        return;
      }

      router.replace("/panel");
      router.refresh();
    } catch {
      setError("Error de conexión, intente de nuevo");
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

      <h1 className="text-center text-2xl font-bold tracking-wide uppercase">
        Acceso al sistema
      </h1>

      <form
        onSubmit={iniciarLogin}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl border border-line bg-surface p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        {!configurado && (
          <div className="rounded-lg border border-wine bg-wine/30 px-3 py-2.5 text-center text-sm text-[#ff6b6b]">
            Supabase no está configurado (.env.local).
            {process.env.NODE_ENV === "development"
              ? " En desarrollo puedes entrar directo al panel."
              : ""}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold tracking-wider text-muted uppercase">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            autoCapitalize="none"
            className="w-full rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-base text-white transition-colors focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,59,59,0.12)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold tracking-wider text-muted uppercase">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
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
          disabled={cargando || !configurado}
          className="mt-1 w-full rounded-lg bg-wine py-3.5 text-lg font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-px hover:bg-wine-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ingresar
        </button>
      </form>

      <footer className="fixed bottom-0 left-0 flex w-full justify-center border-t border-line-soft bg-bg py-3 opacity-70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_FOOTER_URL}
          alt="Black & Red"
          className="h-[30px] object-contain"
        />
      </footer>

      <LoadingOverlay visible={cargando} texto="Verificando..." />
    </main>
  );
}
