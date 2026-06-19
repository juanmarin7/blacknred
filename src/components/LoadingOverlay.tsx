"use client";

import BarraCarga from "./BarraCarga";

export default function LoadingOverlay({
  visible,
  texto = "Cargando...",
}: {
  visible: boolean;
  texto?: string;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-md">
      <BarraCarga />
      <span className="text-sm font-medium tracking-wide text-muted">
        {texto}
      </span>
    </div>
  );
}
