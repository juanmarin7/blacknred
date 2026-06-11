const COLORES: Record<string, string> = {
  pedido: "bg-ok shadow-[0_2px_8px_rgba(30,155,60,0.35)]",
  "pedido parcial": "bg-send shadow-[0_2px_8px_rgba(43,139,196,0.35)]",
  "pedido modificado": "bg-wine shadow-[0_2px_8px_rgba(123,30,30,0.35)]",
  enviado: "bg-send shadow-[0_2px_8px_rgba(43,139,196,0.35)]",
  facturado: "bg-line-strong",
};

export default function EstadoBadge({ estado }: { estado: string }) {
  const color = COLORES[estado.trim().toLowerCase()] ?? "bg-ok";

  return (
    <span
      className={`inline-block rounded-lg px-3 py-1 text-xs font-bold tracking-wide whitespace-nowrap text-white uppercase ${color}`}
    >
      {estado}
    </span>
  );
}
