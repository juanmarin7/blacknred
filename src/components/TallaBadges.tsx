import { esCantidadTallas } from "@/lib/tallas";

/**
 * Render de la columna Cantidad: si viene en formato de tallas
 * ("S : 5 | M : 3") pinta los badges rojos del diseño original.
 */
export default function TallaBadges({
  cantidad,
  empaque,
  grande = false,
}: {
  cantidad: string;
  empaque?: string;
  grande?: boolean;
}) {
  const esTallas =
    esCantidadTallas(cantidad) &&
    (!empaque || empaque === "Tallas" || empaque === "BURBUJA");

  if (!esTallas) {
    return <span>{cantidad}</span>;
  }

  return (
    <span className="flex flex-wrap gap-1">
      {cantidad.split("|").map((p, i) => {
        const [t, c] = p.split(":");
        return (
          <span
            key={i}
            className={`inline-flex items-center rounded-md border border-accent/15 bg-accent/10 whitespace-nowrap ${
              grande ? "px-2.5 py-1 text-base" : "px-2 py-0.5 text-sm"
            }`}
          >
            <span className="mr-1 font-bold text-accent">{t?.trim()}</span>:{" "}
            {c?.trim()}
          </span>
        );
      })}
    </span>
  );
}
