import type { InitialData, PedidoRow } from "./types";

/**
 * Datos de ejemplo para previsualizar la app sin credenciales de Google
 * (activar con MOCK_SHEETS=1 en .env.local). NO usar en producción.
 */

export const MOCK_INITIAL: InitialData = {
  clientes: [
    { id: "C001", nombre: "Almacén El Punto", local: "Local 12", direccion: "Cra 10 # 11-20" },
    { id: "C002", nombre: "Variedades Sofi", local: "Local 8", direccion: "Cl 14 # 9-31" },
    { id: "C003", nombre: "Distribuciones JR", local: "Bodega 3", direccion: "Cra 15 # 4-55" },
  ],
  productos: [
    {
      id: "P001",
      nombre: "Camiseta básica",
      empaques: [1, 2, 3, 4, 5, 6, 7],
      color: "Negro, Rojo, Blanco",
      precio: 45000,
      unidadDocena: "Docena",
    },
    {
      id: "P002",
      nombre: "Medias deportivas",
      empaques: [13],
      color: null,
      precio: 18000,
      unidadDocena: "Docena",
    },
    {
      id: "P003",
      nombre: "Boxer clásico",
      empaques: [1, 8, 2, 3, 4, 5],
      color: "Surtido oscuro, Surtido claro",
      precio: 52000,
      unidadDocena: "Docena",
    },
  ],
  tiposEmpaque: [
    { id: 1, nombre: "Surtido" },
    { id: 2, nombre: "S" },
    { id: 3, nombre: "M" },
    { id: 4, nombre: "L" },
    { id: 5, nombre: "XL" },
    { id: 6, nombre: "2 XL" },
    { id: 7, nombre: "XXXL" },
    { id: 8, nombre: "BURBUJA" },
    { id: 13, nombre: "Docena" },
  ],
  vendedores: [
    { id: "V001", nombre: "Juan Esteban" },
    { id: "V002", nombre: "Carolina" },
  ],
  productosConTallas: ["P001", "P003"],
  tallasPorProducto: {
    P001: ["SURTIDO", "S", "M", "L", "XL", "XXL", "XXXL"],
    P003: ["SURTIDO", "BURBUJA", "S", "M", "L", "XL"],
  },
};

export const MOCK_PEDIDOS: PedidoRow[] = [
  {
    rowNumber: 2,
    codigo: "101",
    cliente: "Almacén El Punto",
    local: "Local 12",
    producto: "Camiseta básica",
    cantidad: "S : 2  |  M : 3  |  L : 1",
    empaque: "Tallas",
    color: "Negro",
    estado: "Pedido",
    descripcion: "Entregar antes del viernes",
  },
  {
    rowNumber: 3,
    codigo: "102",
    cliente: "Variedades Sofi",
    local: "Local 8",
    producto: "Medias deportivas",
    cantidad: "5",
    empaque: "Docena",
    color: "",
    estado: "Pedido",
    descripcion: "",
  },
  {
    rowNumber: 4,
    codigo: "103",
    cliente: "Distribuciones JR",
    local: "Bodega 3",
    producto: "Boxer clásico",
    cantidad: "4",
    empaque: "Surtido",
    color: "Surtido oscuro",
    estado: "Enviado",
    descripcion: "Cliente recoge",
  },
  {
    rowNumber: 5,
    codigo: "104",
    cliente: "Almacén El Punto",
    local: "Local 12",
    producto: "Boxer clásico",
    cantidad: "S : 1  |  M : 2",
    empaque: "BURBUJA",
    color: "Surtido claro",
    estado: "Facturado",
    descripcion: "",
  },
];
