/**
 * Parsea un número en formato colombiano (la hoja se lee con FORMATTED_VALUE):
 * el punto es separador de miles y la coma es decimal. Sirve tanto para dinero
 * (precio) como para cantidades grandes o el código consecutivo: cualquier
 * valor >= 1000 llega con punto de miles y Number() lo rompería.
 *   "43.000"   -> 43000
 *   "1.234,50" -> 1234.5
 *   "1.000"    -> 1000
 *   43000      -> 43000  (ya numérico)
 */
export function parseNumeroCO(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/[^0-9.,-]/g, "").trim();
  if (!s) return 0;
  if (s.includes(",")) {
    // coma = decimal; los puntos son separadores de miles
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // sin coma: los puntos son separadores de miles
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}
