import {
  agregarFilas,
  conBloqueo,
  escribirCeldas,
  leerRango,
  mockActivo,
} from "./sheets";
import { consecutivoAtomicoDisponible, siguienteCodigo } from "./consecutivo";
import { parseNumeroCO } from "./numeros";
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
  PeriodoResumen,
  ResumenVentas,
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
 *
 * El Vendedor (G) e id_vendedor (H) son el usuario autenticado que registra el
 * pedido: nombre = display_name de Supabase, id_vendedor = su correo.
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
    // A:G = id, nombre, local, dirección, (E), teléfono (F), ciudad (G)
    leerRango("Clientes!A2:G"),
    // crudo: el precio (col E) llega como número real (47000), no "47.000".
    leerRango("Productos!A2:F", { crudo: true }),
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
      telefono: String(r[5] ?? ""),
      ciudad: String(r[6] ?? ""),
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
      precio: parseNumeroCO(r[4]),
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
  // Busca la columna por nombre de encabezado; si no la encuentra (encabezado
  // con acento/espacio/otro texto), cae al índice fijo del layout A..Q.
  const at = (nombre: string, fallback: number) => {
    const i = headers.indexOf(nombre);
    return i >= 0 ? i : fallback;
  };
  const idx = {
    codigo: at("Codigo", 0),
    fecha: at("Fecha", 1),
    cliente: at("Nombre Cliente", 2),
    local: at("Local", 3),
    idCliente: at("id_cliente", 5),
    vendedor: at("Vendedor", 6),
    producto: at("Producto", 8),
    idProducto: at("id_producto", 9),
    cantidad: at("Cantidad", 10),
    empaque: at("Tipo empaque", 11),
    color: at("Color", 12),
    descripcion: at("descripción", 13),
    estado: at("Estado", 15),
    precio: at("Precio", 16),
  };

  return data.slice(1).map((row, i) => ({
    rowNumber: i + 2,
    codigo: String(row[idx.codigo] ?? ""),
    fecha: String(row[idx.fecha] ?? ""),
    cliente: String(row[idx.cliente] ?? ""),
    local: String(row[idx.local] ?? ""),
    idCliente: String(row[idx.idCliente] ?? ""),
    vendedor: String(row[idx.vendedor] ?? ""),
    producto: String(row[idx.producto] ?? ""),
    idProducto: String(row[idx.idProducto] ?? ""),
    cantidad: String(row[idx.cantidad] ?? ""),
    empaque: String(row[idx.empaque] ?? ""),
    color: String(row[idx.color] ?? ""),
    estado: String(row[idx.estado] ?? ""),
    descripcion: String(row[idx.descripcion] ?? ""),
    precio: parseNumeroCO(row[idx.precio]),
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
  vendedor: { nombre: string; email: string },
): Promise<{ ok: true; codigo: number }> {
  if (!order || !order.idClienteLocal) {
    throw new Error("Cliente no definido.");
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
    if (!cliente) throw new Error("Cliente no encontrado");

    // Código consecutivo. Piso = MÁXIMO código de la hoja (no la última fila:
    // las filas de "parcial" reusan un código viejo y quedan al final, así que
    // la última fila puede tener un código menor al máximo).
    const codigos = await leerRango(`${SHEET_VENTAS}!A2:A`, { fresco: true });
    const maxHoja = codigos.reduce(
      (m, r) => Math.max(m, parseNumeroCO(r[0])),
      0,
    );

    // El consecutivo lo resuelve Postgres de forma atómica (varias instancias
    // en Vercel). Si Supabase no está o falla, degradamos a max+1 de la hoja
    // (riesgo de duplicado solo en esa ventana) para no bloquear la venta.
    let codigo: number;
    if (consecutivoAtomicoDisponible()) {
      try {
        codigo = await siguienteCodigo(maxHoja);
      } catch (e) {
        console.error("[consecutivo] fallback a max+1 de la hoja:", e);
        codigo = maxHoja + 1;
      }
    } else {
      codigo = maxHoja + 1;
    }

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
        vendedor.email,
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

/* ─────────────── Resumen / tablero (admin) ─────────────── */

/** Medianoche (hora local) de la fecha "dd/MM/yyyy ..." de la hoja, o null. */
function parseFechaVenta(s: unknown): Date | null {
  const m = String(s ?? "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** "Hoy" a medianoche en hora de Colombia (el servidor corre en UTC). */
function hoyBogota(): Date {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return new Date(v("year"), v("month") - 1, v("day"));
}

/**
 * Resumen vacío para modo MOCK (local sin credenciales de Google, MOCK_SHEETS=1).
 * No inventa datos: devuelve todo en cero. En QA/PROD nunca se usa porque ahí
 * `mockActivo()` es false y se lee la hoja real.
 */
function resumenMock(periodo: PeriodoResumen): ResumenVentas {
  return {
    periodo,
    rango: { desde: "—", hasta: "—" },
    vendedor: null,
    vendedoresDisponibles: [],
    montoTotal: 0,
    numPedidos: 0,
    ticketPromedio: 0,
    montoFacturado: 0,
    montoPorCobrar: 0,
    montoEnProceso: 0,
    porVendedor: [],
    porDia: [],
    porEstado: [],
    topProductos: [],
    topClientes: [],
    pendientes: {
      total: 0,
      monto: 0,
      buckets: [
        { rango: "0–2 días", pedidos: 0 },
        { rango: "3–7 días", pedidos: 0 },
        { rango: "8–15 días", pedidos: 0 },
        { rango: "16+ días", pedidos: 0 },
      ],
      masAntiguos: [],
    },
    comparativo: {
      montoAnterior: 0,
      numPedidosAnterior: 0,
      variacionMonto: null,
      variacionPedidos: null,
    },
  };
}

interface Acumulado {
  monto: number;
  cods: Set<string>;
}

/** Rangos [inicio, fin] del periodo actual y del anterior equivalente. */
function rangosPeriodo(periodo: PeriodoResumen, hoy: Date) {
  const dias = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(d.getDate() + n);
    return r;
  };

  if (periodo === "hoy") {
    return { curIni: hoy, curFin: hoy, prevIni: dias(hoy, -1), prevFin: dias(hoy, -1) };
  }
  if (periodo === "semana") {
    const curIni = dias(hoy, -6);
    const prevFin = dias(curIni, -1);
    return { curIni, curFin: hoy, prevIni: dias(prevFin, -6), prevFin };
  }
  // mes: del 1 a hoy; anterior = mes pasado hasta el mismo día
  const curIni = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const transcurridos = hoy.getDate() - 1;
  const prevIni = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const prevFin = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1 + transcurridos);
  return { curIni, curFin: hoy, prevIni, prevFin };
}

export async function getResumenVentas(
  periodo: PeriodoResumen,
  filtroVendedor?: string,
): Promise<ResumenVentas> {
  if (mockActivo()) return resumenMock(periodo);

  // A Codigo | B Fecha | C Cliente | D Local | G Vendedor | I Producto | O Total | P Estado | Q Precio
  const data = await leerRango(`${SHEET_VENTAS}!A2:R`);
  const filtro = filtroVendedor?.trim() || null;

  const hoy = hoyBogota();
  const { curIni, curFin, prevIni, prevFin } = rangosPeriodo(periodo, hoy);
  const enRango = (d: Date, ini: Date, fin: Date) => d >= ini && d <= fin;

  const acumular = (m: Map<string, Acumulado>, clave: string, monto: number, cod: string) => {
    const a = m.get(clave) ?? { monto: 0, cods: new Set<string>() };
    a.monto += monto;
    a.cods.add(cod);
    m.set(clave, a);
  };

  const vendMap = new Map<string, Acumulado>();
  const prodMap = new Map<string, Acumulado>();
  const prodUnidades = new Map<string, number>();
  const cliMap = new Map<string, Acumulado>();
  const diaMap = new Map<string, { label: string } & Acumulado>();
  const estadoMap = new Map<string, Set<string>>();
  const vendedoresSet = new Set<string>();
  const codsGlobal = new Set<string>();
  // Pendientes de despacho de TODO el historial (no por periodo)
  const pendMap = new Map<
    string,
    { fecha: Date; monto: number; cliente: string; vendedor: string; estado: string }
  >();
  let montoTotal = 0;
  let montoFacturado = 0;
  let montoPorCobrar = 0;
  let montoEnProceso = 0;

  // Periodo anterior (solo totales para el comparativo)
  const codsPrev = new Set<string>();
  let montoPrev = 0;

  for (const row of data) {
    const codigo = String(row[0] ?? "");
    if (!codigo) continue;
    const fecha = parseFechaVenta(row[1]);
    if (!fecha) continue;

    const vendedor = String(row[6] ?? "").trim() || "—";
    const estado = String(row[15] ?? "").trim() || "—";
    const estadoL = estado.toLowerCase();
    const monto = parseNumeroCO(row[14]) * parseNumeroCO(row[16]);

    // ── Pendientes de despacho: TODO el historial (respeta filtro de vendedor) ──
    const esPendiente =
      !estadoL.includes("facturad") && !estadoL.includes("enviad");
    if (esPendiente && (!filtro || vendedor === filtro)) {
      const cli = String(row[2] ?? "").trim() || "—";
      const p =
        pendMap.get(codigo) ??
        { fecha, monto: 0, cliente: cli, vendedor, estado };
      if (fecha < p.fecha) p.fecha = fecha;
      p.monto += monto;
      pendMap.set(codigo, p);
    }

    // ── Ventas por periodo ──
    const enCur = enRango(fecha, curIni, curFin);
    const enPrev = enRango(fecha, prevIni, prevFin);
    if (!enCur && !enPrev) continue;

    if (enPrev) {
      if (filtro && vendedor !== filtro) continue;
      montoPrev += monto;
      codsPrev.add(codigo);
      continue;
    }

    // Periodo actual
    vendedoresSet.add(vendedor); // el selector muestra a todos, aunque haya filtro
    if (filtro && vendedor !== filtro) continue;

    const producto = String(row[8] ?? "").trim() || "—";
    const cliente = String(row[2] ?? "").trim() || "—";
    const local = String(row[3] ?? "").trim();

    montoTotal += monto;
    codsGlobal.add(codigo);
    if (estadoL.includes("facturad")) montoFacturado += monto;
    else if (estadoL.includes("enviad")) montoPorCobrar += monto;
    else montoEnProceso += monto;

    acumular(vendMap, vendedor, monto, codigo);
    acumular(prodMap, producto, monto, codigo);
    prodUnidades.set(producto, (prodUnidades.get(producto) ?? 0) + parseNumeroCO(row[14]));
    acumular(cliMap, local ? `${cliente} · ${local}` : cliente, monto, codigo);

    const claveDia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    const labelDia = `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    const dia = diaMap.get(claveDia) ?? { label: labelDia, monto: 0, cods: new Set<string>() };
    dia.monto += monto;
    dia.cods.add(codigo);
    diaMap.set(claveDia, dia);

    const e = estadoMap.get(estado) ?? new Set<string>();
    e.add(codigo);
    estadoMap.set(estado, e);
  }

  const numPedidos = codsGlobal.size;
  const numPedidosAnterior = codsPrev.size;
  const variacion = (actual: number, anterior: number): number | null =>
    anterior > 0 ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null;

  const ranking = (m: Map<string, Acumulado>, limite?: number) => {
    const arr = [...m.entries()]
      .map(([nombre, a]) => ({ nombre, monto: a.monto, pedidos: a.cods.size }))
      .sort((a, b) => b.monto - a.monto);
    return limite ? arr.slice(0, limite) : arr;
  };

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const diaMs = 1000 * 60 * 60 * 24;

  // Pendientes de despacho: antigüedad por bucket + los más viejos
  const pendArr = [...pendMap.entries()].map(([codigo, p]) => ({
    codigo,
    cliente: p.cliente,
    vendedor: p.vendedor,
    estado: p.estado,
    dias: Math.floor((hoy.getTime() - p.fecha.getTime()) / diaMs),
    monto: p.monto,
  }));
  const bucketDe = (d: number) =>
    d <= 2 ? "0–2 días" : d <= 7 ? "3–7 días" : d <= 15 ? "8–15 días" : "16+ días";
  const BUCKETS = ["0–2 días", "3–7 días", "8–15 días", "16+ días"];
  const bucketCount = new Map<string, number>();
  for (const p of pendArr) {
    const b = bucketDe(p.dias);
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1);
  }

  return {
    periodo,
    rango: { desde: fmt(curIni), hasta: fmt(curFin) },
    vendedor: filtro,
    vendedoresDisponibles: [...vendedoresSet].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
    montoTotal,
    numPedidos,
    ticketPromedio: numPedidos ? Math.round(montoTotal / numPedidos) : 0,
    montoFacturado,
    montoPorCobrar,
    montoEnProceso,
    porVendedor: ranking(vendMap),
    porDia: [...diaMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, d]) => ({ fecha: d.label, monto: d.monto, pedidos: d.cods.size })),
    porEstado: [...estadoMap.entries()]
      .map(([estado, cods]) => ({ estado, pedidos: cods.size }))
      .sort((a, b) => b.pedidos - a.pedidos),
    topProductos: ranking(prodMap, 5).map((p) => ({
      ...p,
      unidades: prodUnidades.get(p.nombre) ?? 0,
    })),
    topClientes: ranking(cliMap, 5),
    pendientes: {
      total: pendArr.length,
      monto: pendArr.reduce((s, p) => s + p.monto, 0),
      buckets: BUCKETS.map((rango) => ({
        rango,
        pedidos: bucketCount.get(rango) ?? 0,
      })),
      masAntiguos: [...pendArr]
        .sort((a, b) => b.dias - a.dias)
        .slice(0, 8),
    },
    comparativo: {
      montoAnterior: montoPrev,
      numPedidosAnterior,
      variacionMonto: variacion(montoTotal, montoPrev),
      variacionPedidos: variacion(numPedidos, numPedidosAnterior),
    },
  };
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
