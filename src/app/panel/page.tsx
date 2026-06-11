import Link from "next/link";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import { vistasDePerfil } from "@/lib/perfiles";
import { LOGO_URL, LOGO_FOOTER_URL } from "@/lib/branding";
import LogoutButton from "./LogoutButton";

export default async function PanelPage() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");

  const vistas = vistasDePerfil(sesion.perfil);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 px-4 py-6">
      <div className="flex flex-col items-center gap-2.5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="Black & Red"
          className="h-[70px] object-contain"
        />
        <div className="text-xl font-bold tracking-wide uppercase md:text-2xl">
          Hola, {sesion.nombre}
        </div>
        <div className="text-xs tracking-widest text-muted-2 uppercase">
          {sesion.perfil}
        </div>
      </div>

      <div className="flex w-full max-w-[560px] flex-col gap-3">
        {vistas.map((v) => (
          <Link
            key={v.ruta}
            href={v.ruta}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-6 py-4 text-lg font-semibold text-white transition-all hover:-translate-y-px hover:border-wine hover:bg-line-soft active:translate-y-0"
          >
            <span>{v.label}</span>
            <span className="shrink-0 text-xl text-wine">→</span>
          </Link>
        ))}
      </div>

      <LogoutButton />

      <footer className="fixed bottom-0 left-0 flex w-full justify-center border-t border-line-soft bg-base py-3 opacity-70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_FOOTER_URL}
          alt="Black & Red"
          className="h-[30px] object-contain"
        />
      </footer>
    </main>
  );
}
