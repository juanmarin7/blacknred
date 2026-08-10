import { google, type sheets_v4 } from "googleapis";

/**
 * Capa de acceso a Google Sheets (reemplaza SpreadsheetApp de Apps Script).
 *
 * - Lecturas con cache corto en memoria (TTL) para que N usuarios refrescando
 *   no generen N lecturas a la API.
 * - Escrituras invalidan el cache de la hoja afectada.
 * - `conBloqueo` serializa las escrituras (reemplaza LockService). Nota: el
 *   bloqueo es por instancia del servidor; con el volumen actual es
 *   suficiente, pero si algún día hay muchas instancias concurrentes habría
 *   que mover el consecutivo a otra estrategia.
 */

const TTL_MS = 10_000;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa .env.local (ver .env.example).`,
    );
  }
  return v;
}

export function mockActivo(): boolean {
  return process.env.MOCK_SHEETS === "1";
}

let client: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (client) return client;
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = google.sheets({ version: "v4", auth });
  return client;
}

function spreadsheetId(): string {
  return requiredEnv("SPREADSHEET_ID");
}

type CacheEntry = { at: number; rows: string[][] };
const cache = new Map<string, CacheEntry>();

function hojaDeRango(range: string): string {
  return range.split("!")[0];
}

export function invalidarCache(hoja?: string) {
  if (!hoja) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (hojaDeRango(key) === hoja) cache.delete(key);
  }
}

export async function leerRango(
  range: string,
  opts?: { fresco?: boolean; crudo?: boolean },
): Promise<string[][]> {
  // `crudo` lee con UNFORMATTED_VALUE (números reales, sin formato de miles).
  // Se cachea aparte para no mezclar la versión formateada con la cruda.
  const cacheKey = opts?.crudo ? `${range}#crudo` : range;
  const hit = cache.get(cacheKey);
  if (!opts?.fresco && hit && Date.now() - hit.at < TTL_MS) {
    return hit.rows;
  }

  const res = await getClient().spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range,
    valueRenderOption: opts?.crudo ? "UNFORMATTED_VALUE" : "FORMATTED_VALUE",
  });

  const rows = (res.data.values ?? []) as string[][];
  cache.set(cacheKey, { at: Date.now(), rows });
  return rows;
}

export async function agregarFilas(
  hoja: string,
  filas: (string | number)[][],
): Promise<void> {
  await getClient().spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${hoja}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: filas },
  });
  invalidarCache(hoja);
}

export async function escribirCeldas(
  updates: { range: string; valor: string | number }[],
): Promise<void> {
  await getClient().spreadsheets.values.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates.map((u) => ({ range: u.range, values: [[u.valor]] })),
    },
  });
  const hojas = new Set(updates.map((u) => hojaDeRango(u.range)));
  hojas.forEach((h) => invalidarCache(h));
}

/**
 * Sobrescribe filas en un rango exacto (values.update). A diferencia de
 * `agregarFilas` (append al final), esto pisa las celdas del rango dado —
 * útil para "upsert" cuando ya se sabe el número de fila.
 */
export async function escribirFilas(
  range: string,
  filas: (string | number)[][],
): Promise<void> {
  await getClient().spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: filas },
  });
  invalidarCache(hojaDeRango(range));
}

let cola: Promise<unknown> = Promise.resolve();

/** Serializa operaciones de escritura (sustituye LockService.getScriptLock). */
export function conBloqueo<T>(fn: () => Promise<T>): Promise<T> {
  const resultado = cola.then(fn, fn);
  cola = resultado.catch(() => {});
  return resultado;
}
