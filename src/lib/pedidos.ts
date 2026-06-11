import {
  agregarFilas,
  conBloqueo,
  escribirCeldas,
  leerRango,
  mockActivo,
} from "./sheets";
import {
  calcularRestanteTallas,
  calcularTotalCantidad,
  esCantidadTallas,
  toNumber,
} from "./tallas";
import { MOCK_INITIAL, MOCK_PEDIDOS } from "./mock";
import type {
  InitialData,
  Order,
  PedidoRow,
  VistaPedidos,
} from "./types";

/**
 * Lógica de negocio portada de los Apps Script originales
 * (formulario/code.gs, vistapendientesE, vistafacturacion, vistapendientesTV).
 *
 * Estructura de la hoja Ventas (columnas A..Q):
 *  A Codigo | B Fecha | C Nombre Cliente | D Local | E Direccion | F id_cliente
 *  G Vendedor | H id_vendedor | I Producto | J id_producto | K Cantidad
 *  L Tipo empaque | M Color | N descripción | O Total | P Estado | Q Precio
 */

const SHEET_VENTAS = "Ventas";

const COL = {
  cantidad: 10, // K (índice 0-based)
  empaque: 11, // L
  total: 14, // O
  estado: 15, // P
} as const;

/* ─────────────── Catálogos / datos iniciales ─────────────── */

export async function getInitialData(): Promise<InitialData> {
  if (mockActivo()) return MOCK_INITIAL;

  const [cli, pro, emp, ven] = await Promise.all([
    leerRango("Clientes!A2:D"),
    leerRango("Productos!A2:F"),
    leerRango("TiposEmpaque!A2:B"),
    leerRango("Vendedores!A2:B"),
  ]);

  const clientes = cli
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]),
      nombre: String(r[1] ?? ""),
      local: String(r[2] ?? ""),
      direccion: String(r[3] ?? ""),
    }));

  const productos = pro
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]),
      nombre: String(r[1] ?? ""),
      empaques: String(r[2] ?? "")
        .split(",")
        .map((e) => Number(e.trim()))
        .filter(Boolean),
      color: r[3] ? String(r[3]).trim() : null,
      precio: Number(String(r[4] ?? "").replace(/[^0-9.]/g, "")) || 0,
      unidadDocena: r[5] ? String(r[5]).trim() : "Docena",
    }));

  const tiposEmpaque = emp
    .filter((r) => r[0])
    .map((r) => ({ id: Number(r[0]), nombre: String(r[1] ?? "") }));

  const vendedores = ven
    .filter((r) => r[0])
    .map((r) => ({ id: String(r[0]), nombre: String(r[1] ?? "") }));

  // Misma inferencia de productos con tallas del code.gs original
  const productosConTallas: string[] = [];
  const tallasPorProducto: Record<string, string[]> = {};

  productos.forEach((prod) => {
    let empaquesNombres = prod.empaques
      .map((id) => {
        const e = tiposEmpaque.find((t) => t.id === id);
        return e ? e.nombre.trim() : null;
      })
      .filter((n): n is string => Boolean(n));

    const tieneTallasIndividuales = prod.empaques.some(
      (id) => (id >= 2 && id <= 7) || (id >= 9 && id <= 12),
    );
    const tieneBurbuja = prod.empaques.includes(8);

    if (tieneTallasIndividuales || tieneBurbuja) {
      productosConTallas.push(prod.id);

      const tieneSurtido = prod.empaques.includes(1);
      if (
        tieneSurtido &&
        !empaquesNombres.some((n) => n.toUpperCase() === "SURTIDO")
      ) {
        empaquesNombres.unshift("Surtido");
      }

      empaquesNombres = empaquesNombres
        .map((n) => n.toUpperCase().trim())
        .map((n) => (n === "2 XL" ? "XXL" : n));

      tallasPorProducto[prod.id] = empaquesNombres;
    }
  });

  return {
    clientes,
    productos,
    tiposEmpaque,
    vendedores,
    productosConTallas,
    tallasPorProducto,
  };
}

/* ─────────────── Lectura de pedidos (Ventas) ─────────────── */

async function leerVentasProyectadas(fresco = false): Promise<PedidoRow[]> {
  const data = await leerRango(`${SHEET_VENTAS}!A1:Q`, { fresco });
  if (data.length <= 1) return [];

  const headers = data[0];
  const idx = {
    codigo: headers.indexOf("Codigo"),
    cliente: headers.indexOf("Nombre Cliente"),
    local: headers.indexOf("Local"),
    producto: headers.indexOf("Producto"),
    cantidad: headers.indexOf("Cantidad"),
    empaque: headers.indexOf("Tipo empaque"),
    color: headers.indexOf("Color"),
    estado: headers.indexOf("Estado"),
    descripcion: headers.indexOf("descripción"),
  };

  return data.slice(1).map((row, i) => ({
    rowNumber: i + 2,
    codigo: String(row[idx.codigo] ?? ""),
    cliente: String(row[idx.cliente] ?? ""),
    local: String(row[idx.local] ?? ""),
    producto: String(row[idx.producto] ?? ""),
    cantidad: String(row[idx.cantidad] ?? ""),
    empaque: String(row[idx.empaque] ?? ""),
    color: String(row[idx.color] ?? ""),
    estado: String(row[idx.estado] ?? ""),
    descripcion: String(row[idx.descripcion] ?? ""),
  }));
}

export async function getPedidos(vista: VistaPedidos): Promise<PedidoRow[]> {
  const todos = mockActivo() ? MOCK_PEDIDOS : await leerVentasProyectadas();

  switch (vista) {
    case "despacho":
      return todos.filter((p) =>
        p.estado.trim().toLowerCase().includes("pedido"),
      );
    case "facturacion":
      return todos.filter((p) =>
        p.estado.trim().toLowerCase().includes("enviado"),
      );
    case "estados":
      return todos.filter((p) => p.estado.trim() !== "");
  }
}

/**
 * Firma ligera de cambios (port de getLastChangeTimestamp de la vista TV):
 * solo Cantidad (K) + Estado (P). Si la firma no cambia, el cliente no
 * recarga la tabla completa.
 */
export async function getFirmaVentas(): Promise<string> {
  if (mockActivo()) {
    return MOCK_PEDIDOS.map((p) => p.cantidad + p.estado).join("|");
  }
  const [cantidades, estados] = await Promise.all([
    leerRango(`${SHEET_VENTAS}!K2:K`),
    leerRango(`${SHEET_VENTAS}!P2:P`),
  ]);
  return (
    cantidades.map((r) => r[0] ?? "").join("|") +
    "||" +
    estados.map((r) => r[0] ?? "").join("|")
  );
}

/* ─────────────── Guardar pedido (formulario) ─────────────── */

function fechaPedidoActual(): string {
  // dd/MM/yyyy HH:mm:ss en hora de Colombia, parseable por Sheets (USER_ENTERED)
  const f = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const p = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}:${p("second")}`;
}

export async function saveOrder(
  order: Order,
): Promise<{ ok: true; codigo: number }> {
  if (!order || !order.idClienteLocal || !order.idVendedor) {
    throw new Error("Cliente o vendedor no definidos.");
  }
  if (!order.items || !order.items.length) {
    throw new Error("Pedido vacío");
  }

  if (mockActivo()) {
    return { ok: true, codigo: Math.floor(Math.random() * 900) + 100 };
  }

  return conBloqueo(async () => {
    const data = await getInitialData();

    const cliente = data.clientes.find((c) => c.id === order.idClienteLocal);
    const vendedor = data.vendedores.find((v) => v.id === order.idVendedor);
    if (!cliente) throw new Error("Cliente no encontrado");
    if (!vendedor) throw new Error("Vendedor no encontrado");

    // Código consecutivo: último código de la hoja + 1
    const codigos = await leerRango(`${SHEET_VENTAS}!A2:A`, { fresco: true });
    const ultimo = codigos.length
      ? toNumber(codigos[codigos.length - 1][0])
      : 0;
    const codigo = ultimo + 1;

    const fecha = fechaPedidoActual();
    const filas: (string | number)[][] = [];

    for (const item of order.items) {
      const producto = data.productos.find((p) => p.id === item.idProducto);
      if (!producto) {
        throw new Error("Producto no encontrado: " + item.idProducto);
      }

      const total = calcularTotalCantidad(item.cantidad);

      filas.push([
        codigo,
        fecha,
        cliente.nombre,
        cliente.local,
        cliente.direccion,
        cliente.id,
        vendedor.nombre,
        vendedor.id,
        producto.nombre,
        producto.id,
        item.cantidad,
        item.empaque || "",
        item.color || "",
        item.descripcion || "",
        total,
        "Pedido",
        item.precioFinal || 0,
      ]);
    }

    await agregarFilas(SHEET_VENTAS, filas);
    return { ok: true as const, codigo };
  });
}

/* ─────────────── Despacho: parciales / totales / estados ─────────────── */

function validarFila(row: number) {
  if (!Number.isInteger(row) || row < 2) {
    throw new Error("Fila inválida");
  }
}

export async function modificarParcial(
  row: number,
  cantidadDespacho: string | number,
): Promise<boolean> {
  validarFila(row);
  if (mockActivo()) return true;

  return conBloqueo(async () => {
    const filas = await leerRango(`${SHEET_VENTAS}!A${row}:Q${row}`, {
      fresco: true,
    });
    const fila = filas[0];
    if (!fila) throw new Error("No se encontró la fila " + row);

    const cantidadOriginal = fila[COL.cantidad];

    let restante: string | number;

    if (esCantidadTallas(cantidadOriginal)) {
      restante = calcularRestanteTallas(
        cantidadOriginal,
        String(cantidadDespacho),
      );
    } else {
      restante = toNumber(cantidadOriginal) - toNumber(cantidadDespacho);
      if (Number.isNaN(restante) || restante < 0) {
        throw new Error("Cantidad mayor a la solicitada");
      }
    }

    // Actualizar el pedido original
    const totalDespacho = calcularTotalCantidad(cantidadDespacho);
    await escribirCeldas([
      { range: `${SHEET_VENTAS}!K${row}`, valor: cantidadDespacho },
      { range: `${SHEET_VENTAS}!O${row}`, valor: totalDespacho },
      { range: `${SHEET_VENTAS}!P${row}`, valor: "Pedido Parcial" },
    ]);

    // Crear nuevo pedido con el restante real
    if (restante && restante !== 0 && restante !== "") {
      const nueva: (string | number)[] = [...fila];
      nueva[COL.cantidad] = restante;
      nueva[COL.total] = calcularTotalCantidad(restante);
      nueva[COL.estado] = "Pedido Modificado";
      await agregarFilas(SHEET_VENTAS, [nueva]);
    }

    return true;
  });
}

export async function modificarTotal(
  row: number,
  nuevaCantidad: string | number,
): Promise<boolean> {
  validarFila(row);
  if (mockActivo()) return true;

  return conBloqueo(async () => {
    const nuevoTotal = calcularTotalCantidad(nuevaCantidad);
    await escribirCeldas([
      { range: `${SHEET_VENTAS}!K${row}`, valor: nuevaCantidad },
      { range: `${SHEET_VENTAS}!O${row}`, valor: nuevoTotal },
    ]);
    return true;
  });
}

export async function cambiarEstado(
  row: number,
  estado: "Enviado" | "Facturado",
): Promise<boolean> {
  validarFila(row);
  if (mockActivo()) return true;

  await escribirCeldas([{ range: `${SHEET_VENTAS}!P${row}`, valor: estado }]);
  return true;
}
