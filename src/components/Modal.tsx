"use client";

export default function Modal({
  abierto,
  onCerrar,
  children,
}: {
  abierto: boolean;
  onCerrar?: () => void;
  children: React.ReactNode;
}) {
  if (!abierto) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-[#2a2a2a] bg-surface-3 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
