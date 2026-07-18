import { getInitialData, getPedidos } from "./pedidos";
import { siguienteRemision } from "./consecutivo";
import { calcularTotalCantidad } from "./tallas";
import { mockActivo } from "./sheets";

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
