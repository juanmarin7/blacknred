import { requireAcceso } from "@/lib/auth";
import DespachoView from "./DespachoView";

export const metadata = { title: "Pendientes Despacho — Black & Red" };

export default async function DespachoPage() {
  await requireAcceso("/despacho");
  return <DespachoView />;
}
