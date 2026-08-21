import { getInitialData, getPedidos } from "./pedidos";
import { siguienteRemision } from "./consecutivo";
import { calcularTotalCantidad } from "./tallas";
import {
  mockActivo,
  leerRango,
  agregarFilas,
  escribirFilas,
  conBloqueo,
} from "./sheets";

/** Hoja histórica de remisiones (una fila por remisión, ver README/columnas). */
const HOJA_REMISIONES = "Remisiones";

/**
 * Armado de la "Remisión de despacho" a partir de pedidos de la vista de
 * facturación (estado Enviado). Se seleccionan por código y DEBEN ser del
 * mismo cliente; si son varios, se combinan todos los productos en una sola
 * remisión con un solo número (REM N°). El PDF se maqueta en HTML (vista
 * `/remision`) y se imprime desde el navegador. Ver README.
 */

export interface RemisionItem {
  /** REF = id_producto */
  ref: string;
  cantidad: number;
  descripcion: string;
  valorUni: number;
  total: number;
}

export interface Remision {
  numero: number;
  fecha: string;
  /** Identidad del cliente (id o, si falta, el nombre). El front la usa para
   *  reutilizar el REM N° si hoy ya se asignó uno para este mismo cliente. */
  idCliente: string;
  cliente: {
    nombre: string;
    local: string;
    direccion: string;
    telefono: string;
    ciudad: string;
  };
  vendedor: string;
  items: RemisionItem[];
  granTotal: number;
  /** Códigos de pedido incluidos (para referencia/auditoría). */
  codigos: string[];
  /** Filas de la hoja incluidas (rowNumber, únicos). El front las usa para
   *  decidir si una remisión rearmada es "la misma" (comparten pedidos). */
  filas: number[];
}

/** Fecha de hoy en Bogotá, estilo "02-jul-2026". */
function fechaHoyBogota(): string {
  const partes = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date());
  const v = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  const mes = v("month").replace(".", "");
  return `${v("day")}-${mes}-${v("year")}`;
}

/**
 * Asigna el SIGUIENTE número de remisión de forma atómica (consume consecutivo).
 * Se llama solo al imprimir, no al previsualizar, para no gastar números si el
 * facturador cierra la vista sin imprimir.
 */
export async function asignarNumeroRemision(): Promise<number> {
  return mockActivo() ? 190 : siguienteRemision();
}

/**
 * Arma la remisión para las filas seleccionadas (por número de fila de la hoja,
 * siempre único). Lanza si mezclan clientes o si no hay filas válidas. NO asigna
 * número (numero = 0); ese se pide aparte con `asignarNumeroRemision` al imprimir.
 */
export async function generarRemision(filasSel: number[]): Promise<Remision> {
  const seleccion = new Set((filasSel ?? []).map((n) => Number(n)));
  if (seleccion.size === 0) {
    throw new Error("No se seleccionaron pedidos.");
  }

  // Solo pedidos en facturación (Enviado), filtrados a las filas elegidas.
  const enviados = await getPedidos("facturacion");
  const filas = enviados.filter((p) => seleccion.has(p.rowNumber));
  if (filas.length === 0) {
    throw new Error("Los pedidos seleccionados ya no están disponibles.");
  }

  // Validación: todas las filas deben ser del mismo cliente.
  const idsCliente = new Set(filas.map((f) => f.idCliente || f.cliente));
  if (idsCliente.size > 1) {
    throw new Error(
      "Solo se pueden combinar pedidos del mismo cliente en una remisión.",
    );
  }

  // Datos del cliente (tel/ciudad viven en la hoja Clientes, no en Ventas).
  const { clientes } = await getInitialData();
  const idCliente = filas[0].idCliente;
  const cli = clientes.find((c) => c.id === idCliente);

  const items: RemisionItem[] = filas.map((f) => {
    const cantidad = calcularTotalCantidad(f.cantidad);
    const total = cantidad * f.precio;
    return {
      ref: f.idProducto,
      cantidad,
      descripcion: f.producto,
      valorUni: f.precio,
      total,
    };
  });

  const granTotal = items.reduce((s, it) => s + it.total, 0);

  // Vendedor: normalmente único; si difieren, se listan.
  const vendedores = [...new Set(filas.map((f) => f.vendedor).filter(Boolean))];

  return {
    numero: 0, // se asigna al imprimir (ver asignarNumeroRemision)
    fecha: fechaHoyBogota(),
    idCliente: idCliente || filas[0].cliente,
    cliente: {
      nombre: cli?.nombre || filas[0].cliente,
      local: cli?.local || filas[0].local || "",
      direccion: cli?.direccion || "",
      telefono: cli?.telefono || "",
      ciudad: cli?.ciudad || "",
    },
    vendedor: vendedores.join(" / "),
    items,
    granTotal,
    codigos: [...new Set(filas.map((f) => f.codigo))],
    filas: filas.map((f) => f.rowNumber),
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Persistencia en la hoja histórica `Remisiones` (una fila por remisión).
 * El detalle de productos va serializado en una sola celda:
 *   "REF | descripción | cantidad | valorUni | total"  (un producto por línea)
 * ──────────────────────────────────────────────────────────────────────── */

/** Serializa los ítems a la celda `detalle`. */
export function serializarDetalle(items: RemisionItem[]): string {
  return items
    .map((i) =>
      [i.ref, i.descripcion, i.cantidad, i.valorUni, i.total].join(" | "),
    )
    .join("\n");
}

/** Reconstruye los ítems desde la celda `detalle`. Tolera `|` en la descripción
 *  (ref = primer campo; cantidad/valorUni/total = últimos tres). */
export function parsearDetalle(detalle: string): RemisionItem[] {
  return String(detalle || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const p = linea.split("|").map((s) => s.trim());
      const ref = p[0] ?? "";
      const total = Number(p[p.length - 1]) || 0;
      const valorUni = Number(p[p.length - 2]) || 0;
      const cantidad = Number(p[p.length - 3]) || 0;
      const descripcion = p.slice(1, Math.max(1, p.length - 3)).join(" | ");
      return { ref, cantidad, descripcion, valorUni, total };
    });
}

/** Marca de tiempo "AAAA-MM-DD HH:mm" en horario de Bogotá. */
function timestampBogota(): string {
  const p = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")} ${v("hour")}:${v("minute")}`;
}

/** Arma la fila (A..O) para la hoja `Remisiones`. */
function filaRegistro(
  rem: Remision,
  tipo: "original" | "modificada",
  pct: number,
): (string | number)[] {
  return [
    rem.numero, // A rem_n
    rem.fecha, // B fecha
    tipo, // C tipo
    pct, // D pct
    rem.idCliente, // E id_cliente
    rem.cliente.nombre, // F cliente
    rem.cliente.local, // G local
    rem.cliente.direccion, // H direccion
    rem.cliente.telefono, // I telefono
    rem.cliente.ciudad, // J ciudad
    rem.vendedor, // K vendedor
    rem.codigos.join(", "), // L codigos
    rem.granTotal, // M total
    serializarDetalle(rem.items), // N detalle
    timestampBogota(), // O creada_en
  ];
}

/**
 * Upsert de una fila en la hoja histórica, idempotente por (REM N° + tipo): si
 * ya existe una fila de ese mismo número y tipo la sobrescribe, si no la agrega.
 * La clave incluye el `tipo` para que la `modificada` NO pise a la `original`
 * (ambas comparten REM N°). En modo mock no persiste (no hay hoja real).
 */
async function upsertRegistro(
  rem: Remision,
  tipo: "original" | "modificada",
  pct: number,
): Promise<void> {
  if (mockActivo()) return;
  if (!rem?.numero || rem.numero <= 0) {
    throw new Error("La remisión no tiene número asignado.");
  }

  await conBloqueo(async () => {
    const filas = await leerRango(`${HOJA_REMISIONES}!A2:O`, { fresco: true });
    const idx = filas.findIndex(
      (r) =>
        Number(r[0]) === rem.numero &&
        String(r[2] || "").toLowerCase() === tipo,
    );
    const fila = filaRegistro(rem, tipo, pct);
    if (idx >= 0) {
      await escribirFilas(`${HOJA_REMISIONES}!A${idx + 2}`, [fila]);
    } else {
      await agregarFilas(HOJA_REMISIONES, [fila]);
    }
  });
}

/**
 * Registra la remisión ORIGINAL en la hoja histórica. Idempotente por REM N°:
 * si ya existe una fila `original` con ese número (reimpresión o rearme), la
 * sobrescribe en vez de duplicar. Se llama al imprimir, cuando el número ya
 * está firme.
 */
export async function registrarRemision(rem: Remision): Promise<void> {
  await upsertRegistro(rem, "original", 0);
}

/* ────────────────────────────────────────────────────────────────────────
 * M3 — Lectura de la hoja `Remisiones` y modificación por porcentaje.
 * ──────────────────────────────────────────────────────────────────────── */

/** Una fila de la hoja `Remisiones` ya reconstruida como `Remision` + metadatos. */
export interface RegistroRemision {
  tipo: "original" | "modificada";
  /** % que se restó (0 en la original). */
  pct: number;
  /** Marca de tiempo en que se guardó la fila. */
  creadaEn: string;
  rem: Remision;
}

/** Una remisión con su versión original y, si existe, su versión modificada. */
export interface RemisionAgrupada {
  numero: number;
  original: RegistroRemision | null;
  modificada: RegistroRemision | null;
}

/** Reconstruye un `RegistroRemision` desde una fila A..O de la hoja. */
function registroDesdeFila(r: (string | number)[]): RegistroRemision {
  const numero = Number(r[0]) || 0;
  const tipo =
    String(r[2] ?? "").toLowerCase() === "modificada" ? "modificada" : "original";
  return {
    tipo,
    pct: Number(r[3]) || 0,
    creadaEn: String(r[14] ?? ""),
    rem: {
      numero,
      fecha: String(r[1] ?? ""),
      idCliente: String(r[4] ?? ""),
      cliente: {
        nombre: String(r[5] ?? ""),
        local: String(r[6] ?? ""),
        direccion: String(r[7] ?? ""),
        telefono: String(r[8] ?? ""),
        ciudad: String(r[9] ?? ""),
      },
      vendedor: String(r[10] ?? ""),
      items: parsearDetalle(String(r[13] ?? "")),
      granTotal: Number(r[12]) || 0,
      codigos: String(r[11] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      filas: [], // la hoja no guarda los rowNumber; no se necesitan en /remisiones
    },
  };
}

/**
 * Lee la hoja histórica y agrupa por REM N°: cada número trae su `original` y,
 * si ya fue modificada, su `modificada`. Ordenado del número más alto al más
 * bajo (las últimas remisiones primero). En modo mock devuelve lista vacía.
 * Se lee en crudo (UNFORMATTED) para que el total llegue como número real.
 */
export async function leerRemisiones(): Promise<RemisionAgrupada[]> {
  if (mockActivo()) return [];

  const filas = await leerRango(`${HOJA_REMISIONES}!A2:O`, {
    fresco: true,
    crudo: true,
  });

  const porNumero = new Map<number, RemisionAgrupada>();
  for (const fila of filas) {
    if (fila[0] === undefined || fila[0] === "") continue;
    const reg = registroDesdeFila(fila);
    let g = porNumero.get(reg.rem.numero);
    if (!g) {
      g = { numero: reg.rem.numero, original: null, modificada: null };
      porNumero.set(reg.rem.numero, g);
    }
    if (reg.tipo === "modificada") g.modificada = reg;
    else g.original = reg;
  }

  return [...porNumero.values()].sort((a, b) => b.numero - a.numero);
}

/**
 * Aplica una reducción porcentual a la remisión. `pct` es el % que se QUITA
 * (10 → queda el 90%). Solo se reduce la CANTIDAD de cada ítem (redondeada); el
 * valor unitario NO se toca. El total de cada línea se RECALCULA = cantidad ×
 * valorUni. (Decisión del cliente 2026-08-21: aplicar el % también al valor
 * unitario alteraba por completo el resultado, así que se dejó fuera.) Pura.
 */
export function aplicarPorcentaje(rem: Remision, pct: number): Remision {
  const factor = 1 - pct / 100;
  const items = rem.items.map((it) => {
    const cantidad = Math.round(it.cantidad * factor);
    return { ...it, cantidad, total: cantidad * it.valorUni };
  });
  return {
    ...rem,
    items,
    granTotal: items.reduce((s, it) => s + it.total, 0),
  };
}

/**
 * Carga la remisión ORIGINAL de la hoja por su número, le aplica el % y guarda
 * la versión MODIFICADA como fila aparte (upsert por número+tipo: no pisa la
 * original; si ya había una modificada la reemplaza). Mantiene el mismo REM N°.
 * Devuelve la remisión modificada.
 */
export async function modificarRemision(
  numero: number,
  pct: number,
): Promise<Remision> {
  const grupos = await leerRemisiones();
  const grupo = grupos.find((g) => g.numero === numero);
  if (!grupo?.original) {
    throw new Error(`No se encontró la remisión ${numero}.`);
  }
  const modificada = aplicarPorcentaje(grupo.original.rem, pct);
  await upsertRegistro(modificada, "modificada", pct);
  return modificada;
}
