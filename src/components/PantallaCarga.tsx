import BarraCarga from "./BarraCarga";

/**
 * Pantalla de carga branded (sin logo todavía: usa el wordmark de la marca).
 * Se usa como fallback de navegación (loading.tsx) y en el splash de arranque.
 * Cuando exista el logo real, se reemplaza el wordmark por la imagen.
 */
export default function PantallaCarga() {
  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-base">
      <div className="animate-fade-in flex flex-col items-center gap-5">
        <div className="text-4xl font-extrabold tracking-[0.18em] md:text-5xl">
          <span className="text-white">BLACK</span>
          <span className="text-accent">&nbsp;&amp;&nbsp;</span>
          <span className="text-white">RED</span>
        </div>

        <BarraCarga />

        <div className="text-[11px] tracking-[0.32em] text-muted-2 uppercase">
          Sistema de pedidos
        </div>
      </div>
    </div>
  );
}
