import { requireAcceso } from "@/lib/auth";
import EstadosView from "./EstadosView";

export const metadata = { title: "Vista Estados — Black & Red" };

export default async function EstadosPage() {
  await requireAcceso("/estados");
  return <EstadosView />;
}
