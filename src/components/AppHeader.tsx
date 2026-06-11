import Link from "next/link";
import { LOGO_URL } from "@/lib/branding";

interface Props {
  titulo: string;
  subtitulo?: React.ReactNode;
  /** muestra el botón ← Volver al panel */
  volver?: boolean;
}

export default function AppHeader({ titulo, subtitulo, volver = true }: Props) {
  return (
    <header className="flex items-center gap-4 border-b-2 border-wine bg-gradient-to-b from-surface to-base px-4 py-3 md:px-10 md:py-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt="Black & Red"
        className="h-12 w-auto shrink-0 object-contain md:h-[70px]"
      />
      <div className="flex-1 text-center">
        <h1 className="text-xl font-bold tracking-wide uppercase md:text-3xl">
          {titulo}
        </h1>
        {subtitulo ? (
          <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-2 dot-vivo md:text-base">
            {subtitulo}
          </div>
        ) : null}
      </div>
      {volver ? (
        <Link
          href="/panel"
          className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-white"
        >
          ← Volver
        </Link>
      ) : null}
    </header>
  );
}
