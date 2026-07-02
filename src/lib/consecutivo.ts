import { adminDisponible, createAdminClient } from "./supabase/admin";

/**
 * Consecutivo atómico del código de pedido.
 *
 * Problema que resuelve: en Vercel corren varias instancias (lambdas) a la vez;
 * `conBloqueo` de sheets.ts solo serializa DENTRO de una instancia, así que dos
 * pedidos simultáneos en instancias distintas podían leer el mismo "último
 * código" y duplicarlo. Postgres (Supabase) sí da atomicidad real.
 *
 * La fuente de verdad es una fila por ENTORNO en la tabla `contadores_pedido`
 * (clave = SPREADSHEET_ID, para que QA y PROD —que comparten el mismo proyecto
 * Supabase— no compartan el consecutivo). La función SQL `siguiente_codigo_pedido`
 * hace el incremento atómico y respeta un piso (`p_min`) para que el código
 * siempre quede por encima de lo que ya haya en la hoja. Ver `sql/consecutivo.sql`.
 */

/** ¿Está disponible el contador atómico? (requiere service_role de Supabase). */
export function consecutivoAtomicoDisponible(): boolean {
  return adminDisponible();
}

/**
 * Devuelve el siguiente código de pedido de forma atómica.
 * @param pisoHoja último (máximo) código presente hoy en la hoja; el resultado
 *   siempre será mayor que este valor.
 */
export async function siguienteCodigo(pisoHoja: number): Promise<number> {
  const clave = process.env.SPREADSHEET_ID ?? "default";
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("siguiente_codigo_pedido", {
    p_clave: clave,
    p_min: Math.max(0, Math.trunc(pisoHoja)),
  });
  if (error) {
    throw new Error("RPC siguiente_codigo_pedido: " + error.message);
  }
  const n = Number(data);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Consecutivo inválido devuelto por Postgres: " + String(data));
  }
  return n;
}
