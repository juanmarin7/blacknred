export type Perfil = "admin" | "vendedor" | "facturador" | "despachador";

export interface Cliente {
  id: string;
  nombre: string;
  local: string;
  direccion: string;
}

export interface Producto {
  id: string;
  nombre: string;
  /** IDs de TiposEmpaque permitidos para el producto */
  empaques: number[];
  /** Lista de colores separada por comas en la hoja, o null */
  color: string | null;
  precio: number;
  /** 'Docena' | 'Unidad' */
  unidadDocena: string;
}

export interface TipoEmpaque {
  id: number;
  nombre: string;
}

export interface Vendedor {
  id: string;
  nombre: string;
}

export interface InitialData {
  clientes: Cliente[];
  productos: Producto[];
  tiposEmpaque: TipoEmpaque[];
  vendedores: Vendedor[];
  /** IDs de productos que se manejan por tallas/rangos */
  productosConTallas: string[];
  /** id producto -> nombres de empaques/tallas normalizados en mayúsculas */
  tallasPorProducto: Record<string, string[]>;
}

/** Fila de la hoja Ventas proyectada para las vistas */
export interface PedidoRow {
  rowNumber: number;
  codigo: string;
  cliente: string;
  local: string;
  producto: string;
  /** número, o string tipo "S : 5  |  M : 3" para tallas */
  cantidad: string;
  empaque: string;
  color: string;
  estado: string;
  descripcion: string;
}

export interface OrderItem {
  idProducto: string;
  /** número o string de tallas "S : 5  |  M : 3" */
  cantidad: string | number;
  empaque: string;
  descripcion: string;
  color: string;
  precioFinal: number;
}

export interface Order {
  idClienteLocal: string;
  items: OrderItem[];
}

export type VistaPedidos = "despacho" | "facturacion" | "estados";

export type PeriodoResumen = "hoy" | "semana" | "mes";

export interface RankingItem {
  nombre: string;
  monto: number;
  pedidos: number;
  /** Unidades vendidas (solo se llena para productos). */
  unidades?: number;
}

export interface ResumenVentas {
  periodo: PeriodoResumen;
  /** Rango de fechas cubierto (dd/MM/yyyy) para mostrar en el encabezado. */
  rango: { desde: string; hasta: string };
  /** Vendedor al que se filtró el tablero, o null = todos. */
  vendedor: string | null;
  /** Vendedores con ventas en el periodo (para el selector de filtro). */
  vendedoresDisponibles: string[];
  montoTotal: number;
  numPedidos: number;
  ticketPromedio: number;
  /** Reparto del monto por etapa de cobro (suman montoTotal). */
  montoFacturado: number; // estado Facturado = cobrado
  montoPorCobrar: number; // estado Enviado = despachado, falta facturar
  montoEnProceso: number; // Pedido / Parcial = aún no despachado
  porVendedor: RankingItem[];
  porDia: { fecha: string; monto: number; pedidos: number }[];
  porEstado: { estado: string; pedidos: number }[];
  topProductos: RankingItem[];
  topClientes: RankingItem[];
  /** Pedidos del periodo aún sin despachar (estado Pedido/Parcial). */
  sinDespachar: { pedidos: number; diasMasViejo: number };
  /** Comparativo contra el periodo anterior equivalente. */
  comparativo: {
    montoAnterior: number;
    numPedidosAnterior: number;
    /** Variación % (null si el periodo anterior fue 0). */
    variacionMonto: number | null;
    variacionPedidos: number | null;
  };
}
