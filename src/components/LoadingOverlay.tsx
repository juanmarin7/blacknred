"use client";

export default function LoadingOverlay({
  visible,
  texto = "Cargando...",
}: {
  visible: boolean;
  texto?: string;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-md">
      <div className="h-12 w-12 animate-[spin_0.8s_linear_infinite] rounded-full border-4 border-line border-t-accent" />
      <span className="text-lg font-medium text-muted">{texto}</span>
    </div>
  );
}
