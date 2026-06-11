/**
 * Lógica de tallas portada 1:1 de los Apps Script originales
 * (vistapendientes: parseTallas / formatTallas / calcularRestanteTallas /
 * calcularTotalCantidad). El formato en la hoja es "S : 5  |  M : 3".
 */

export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const directo = Number(v);
  if (!Number.isNaN(directo)) return directo;
  const limpio = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isNaN(limpio) ? 0 : limpio;
}

export function esCantidadTallas(cantidad: unknown): cantidad is string {
  return typeof cantidad === "string" && cantidad.includes(":");
}

export function parseTallas(txt: unknown): Record<string, number> {
  const obj: Record<string, number> = {};
  if (!txt || typeof txt !== "string") return obj;

  txt.split("|").forEach((p) => {
    const parts = p.split(":");
    if (parts.length !== 2) return;
    const talla = parts[0].trim();
    const cantidad = Number(parts[1]);
    obj[talla] = Number.isNaN(cantidad) ? 0 : cantidad;
  });

  return obj;
}

export function formatTallas(obj: Record<string, number>): string {
  return Object.keys(obj)
    .map((k) => `${k}:${obj[k]}`)
    .join("|");
}

export function calcularRestanteTallas(
  original: string,
  despacho: string,
): string {
  const objOriginal = parseTallas(original);
  const objDespacho = parseTallas(despacho);

  const restante: Record<string, number> = {};

  Object.keys(objOriginal).forEach((talla) => {
    const o = Number(objOriginal[talla] || 0);
    const d = Number(objDespacho[talla] || 0);

    if (d > o) {
      throw new Error("Despacho mayor al solicitado en talla " + talla);
    }

    const r = o - d;
    if (r > 0) restante[talla] = r;
  });

  return formatTallas(restante);
}

export function calcularTotalCantidad(cantidad: string | number): number {
  if (esCantidadTallas(cantidad)) {
    const obj = parseTallas(cantidad);
    const total = Object.values(obj).reduce(
      (acc, val) => acc + Number(val || 0),
      0,
    );
    return Number.isNaN(total) ? 0 : total;
  }

  const num = toNumber(cantidad);
  return Number.isNaN(num) ? 0 : num;
}
