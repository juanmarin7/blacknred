import type { Perfil } from "./types";

/** Vistas de la app (equivalente a VISTAS + PERFILES del login original) */
export const VISTAS: { ruta: string; label: string }[] = [
  { ruta: "/pedidos", label: "Formulario Ventas" },
  { ruta: "/despacho", label: "Pendientes Despacho" },
  { ruta: "/tv", label: "Pendientes TV" },
  { ruta: "/facturacion", label: "Facturación" },
  { ruta: "/estados", label: "Vista Estados" },
];

export const ACCESOS: Record<Perfil, string[]> = {
  admin: ["/pedidos", "/despacho", "/tv", "/facturacion", "/estados"],
  vendedor: ["/pedidos", "/estados"],
  facturador: ["/facturacion"],
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
