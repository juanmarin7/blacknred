import type { Perfil } from "./types";

/**
 * Vistas de la app (equivalente a VISTAS + PERFILES del login original).
 * Nota: `/remisiones` (M3, modificar remisiones) NO figura aquí a propósito —
 * queda accesible por URL para quien tenga permiso (ver ACCESOS) pero OCULTO del
 * menú del panel hasta el go-live (equivale al "feature flag" acordado).
 */
export const VISTAS: { ruta: string; label: string }[] = [
  { ruta: "/pedidos", label: "Formulario Ventas" },
  { ruta: "/despacho", label: "Pendientes Despacho" },
  { ruta: "/tv", label: "Pendientes TV" },
  { ruta: "/facturacion", label: "Facturación" },
  { ruta: "/estados", label: "Vista Estados" },
  { ruta: "/admin/tablero", label: "Tablero (métricas)" },
  { ruta: "/admin/usuarios", label: "Administrar usuarios" },
];

export const ACCESOS: Record<Perfil, string[]> = {
  admin: [
    "/pedidos",
    "/despacho",
    "/tv",
    "/facturacion",
    "/remisiones",
    "/estados",
    "/admin/tablero",
    "/admin/usuarios",
  ],
  vendedor: ["/pedidos", "/estados"],
  facturador: ["/facturacion", "/remisiones"],
  despachador: ["/despacho", "/tv", "/estados"],
};

export const RUTAS_PROTEGIDAS = VISTAS.map((v) => v.ruta);

export function esPerfil(v: unknown): v is Perfil {
  return (
    v === "admin" ||
    v === "vendedor" ||
    v === "facturador" ||
    v === "despachador"
  );
}

export function puedeAcceder(perfil: Perfil, ruta: string): boolean {
  return ACCESOS[perfil]?.some((r) => ruta === r || ruta.startsWith(r + "/")) ?? false;
}

export function vistasDePerfil(perfil: Perfil) {
  return VISTAS.filter((v) => ACCESOS[perfil]?.includes(v.ruta));
}
