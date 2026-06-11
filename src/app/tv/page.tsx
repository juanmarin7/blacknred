import { redirect } from "next/navigation";
import { getSesion, tvKeyValida } from "@/lib/auth";
import { puedeAcceder } from "@/lib/perfiles";
import TvView from "./TvView";

export const metadata = { title: "Pendientes TV — Black & Red" };

/**
 * Pantalla para el televisor del área de despacho (solo lectura).
 * Acceso: con sesión (admin/despachador) o con la llave de TV en la URL
 * (/tv?key=XXXX), pensada para dejar abierta en el TV sin login.
 */
export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const conLlave = tvKeyValida(key);

  if (!conLlave) {
    const sesion = await getSesion();
    if (!sesion) redirect("/login");
    if (!puedeAcceder(sesion.perfil, "/tv")) redirect("/panel");
  }

  return <TvView tvKey={conLlave ? key : undefined} />;
}
