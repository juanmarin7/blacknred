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
 * Genera la remisión para los códigos seleccionados. Lanza si mezclan clientes
 * o si no hay filas válidas. Asigna el número de remisión de forma atómica.
 */
export async function generarRemision(codigos: string[]): Promise<Remision> {
  const seleccion = new Set((codigos ?? []).map((c) => String(c).trim()));
  if (seleccion.size === 0) {
    throw new Error("No se seleccionaron pedidos.");
  }

  // Solo pedidos en facturación (Enviado), filtrados a los códigos elegidos.
  const enviados = await getPedidos("facturacion");
  const filas = enviados.filter((p) => seleccion.has(String(p.codigo).trim()));
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

  const numero = mockActivo() ? 190 : await siguienteRemision();

  return {
    numero,
    fecha: fechaHoyBogota(),
    cliente: {
      nombre: cli?.nombre || filas[0].cliente,
      direccion: cli?.direccion || "",
      telefono: cli?.telefono || "",
      ciudad: cli?.ciudad || "",
    },
    vendedor: vendedores.join(" / "),
    items,
    granTotal,
    codigos: [...seleccion],
  };
}
