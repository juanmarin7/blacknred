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
